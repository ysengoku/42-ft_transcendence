import json
import logging
from typing import TYPE_CHECKING

from asgiref.sync import async_to_sync

from common.guarded_websocket_consumer import GuardedWebsocketConsumer
from pong.game_protocol import GameServerToClient, GameServerToGameWorker, PongCloseCodes
from pong.models import GameRoom, GameRoomPlayer

if TYPE_CHECKING:
    from tournaments.models import Bracket
    from users.models import User

logger = logging.getLogger("server")


class GameServerConsumer(GuardedWebsocketConsumer):
    """
    Interface between game worker, which runs an actual game, and the client.
    Sends to the worker events of player inputs and their connecction state for handling.
    Sends to the client the data it receives from the game worker.
    """

    def connect(self):
        self.player: None | GameRoomPlayer = None
        self.user: None | User = self.scope.get("user")
        self.game_room_id: str = self.scope["url_route"]["kwargs"]["game_room_id"]
        self.game_room_group_name = f"game_room_{self.game_room_id}"
        self.accept()
        if not self.user:
            logger.warning("[GameRoom.connect]: unauthorized user tried to join game room {%s}", self.game_room_id)
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        game_room_qs: GameRoom = GameRoom.objects.for_id(self.game_room_id)
        if not game_room_qs.exists():
            logger.warning(
                "[GameRoom.connect]: user {%s} tried to join non-existant game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        self.game_room: GameRoom = game_room_qs.for_players(self.user.profile).for_ongoing_status().first()
        if not self.game_room:
            logger.warning(
                "[GameRoom.connect]: illegal user {%s} tried to join game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        self.player = GameRoomPlayer.objects.filter(profile=self.user.profile, game_room=self.game_room).first()
        self.player.inc_number_of_connections()
        if self.player.number_of_connections > 1:
            logger.warning(
                "[GameRoom.connect]: user {%s} is already connected to the game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close(PongCloseCodes.ALREADY_IN_GAME)
            return

        logger.info(
            "[GameRoom.connect]: user {%s} successefully joined game room {%s}. Player id of the user is {%s}",
            self.user.profile,
            self.game_room_id,
            str(self.player.id),
        )
        profile = self.user.profile
        player_id = str(self.player.id)
        async_to_sync(self.channel_layer.group_add)(self.game_room_group_name, self.channel_name)
        async_to_sync(self.channel_layer.group_add)(f"player_{player_id}", self.channel_name)
        is_in_tournament = self.game_room.is_in_tournament()
        if is_in_tournament:
            bracket: Bracket = self.game_room.bracket
            bracket.set_ongoing()
            bracket_id = str(bracket.id)
            tournament_id = str(bracket.round.tournament.id)
            name = bracket.participant1.alias if bracket.participant1.profile == profile else bracket.participant2.alias
        else:
            name = self.user.nickname if self.user.nickname else self.user.username
            bracket_id = None
            tournament_id = None
        async_to_sync(self.channel_layer.send)(
            "game",
            GameServerToGameWorker.PlayerConnected(
                type="player_connected",
                game_room_id=self.game_room_id,
                player_id=player_id,
                profile_id=str(profile.id),
                name=name,
                avatar=profile.avatar,
                elo=profile.elo,
                settings=self.game_room.settings,
                is_in_tournament=is_in_tournament,
                bracket_id=bracket_id,
                tournament_id=tournament_id,
            ),
        )

    def disconnect(self, close_code):
        if close_code == PongCloseCodes.ILLEGAL_CONNECTION or not self.player:
            return

        async_to_sync(self.channel_layer.group_discard)(self.game_room_group_name, self.channel_name)
        async_to_sync(self.channel_layer.group_discard)(f"player_{str(self.player.id)}", self.channel_name)
        self.player.dec_number_of_connections()
        if close_code == PongCloseCodes.NORMAL_CLOSURE:
            logger.info(
                "[GameRoom.disconnect]: player {%s} has been disconnected from the game room {%s} normally",
                self.user.profile,
                self.game_room_id,
            )
            return

        # the player has a valid connection, so we return here without notify the worker of disconnect, so we don't
        # ruin the other valid connection
        if close_code == PongCloseCodes.ALREADY_IN_GAME:
            return

        async_to_sync(self.channel_layer.send)(
            "game",
            GameServerToGameWorker.PlayerDisconnected(
                type="player_disconnected",
                game_room_id=self.game_room_id,
                player_id=str(self.player.id),
            ),
        )
        logger.info(
            "[GameRoom.disconnect]: player {%s} has left game room {%s}",
            self.user.profile,
            self.game_room_id,
        )

    def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            self.close(PongCloseCodes.BAD_DATA)
            logger.warning(
                "[GameRoom.receive]: user {%s} sent invalid json to the game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            return

        match text_data_json:
            case {
                "action": "move_left" | "move_right" as action,
                "content": int(content),
                "player_id": str(player_id),
            }:
                async_to_sync(self.channel_layer.send)(
                    "game",
                    GameServerToGameWorker.PlayerInputed(
                        type="player_inputed",
                        action=action,
                        game_room_id=self.game_room_id,
                        player_id=player_id,
                        content=content,
                    ),
                )

            case unknown:
                self.close(PongCloseCodes.BAD_DATA)
                logger.warning(
                    "[GameRoom.receive]: user {%s} sent an invalid action {%s} to the game room {%s}",
                    self.user.profile,
                    unknown,
                    self.game_room_id,
                )

    ##############################
    # GAME WORKER EVENT HANDLERS #
    ##############################
    # Simple handlers to propagate data from the game worker to the clients.
    # The handlers filter out "type" key from the dicts to avoid leaking implementation details.
    # DO NOT CALL THE `del` ON `type` KEY. This breaks Django Channels.
    def worker_to_client_close(self, event: GameServerToClient.WorkerToClientClose):
        """Send data to the client and close connection."""
        self.send(text_data=json.dumps({k: v for k, v in event.items() if k != "type"}))
        self.close(event["close_code"])

    def worker_to_client_open(self, event: GameServerToClient.WorkerToClientOpen):
        """Send data to the client without closing connection."""
        self.send(text_data=json.dumps({k: v for k, v in event.items() if k != "type"}))
