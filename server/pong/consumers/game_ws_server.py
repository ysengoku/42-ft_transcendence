import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from pong.consumers.game_protocol import GameServerToClient, GameServerToGameWorker, PongCloseCodes
from pong.models import GameRoom, GameRoomPlayer

logger = logging.getLogger("server")


class GameServerConsumer(WebsocketConsumer):
    """
    Interface between game worker, which runs an actual game, and the client.
    Sends to the worker events of player inputs and their connecction state for handling.
    Sends to the client the data it receives from the game worker.
    """

    def connect(self):
        self.player = None
        self.user = self.scope.get("user")
        self.game_room_id = self.scope["url_route"]["kwargs"]["game_room_id"]
        self.game_room_group_name = f"game_room_{self.game_room_id}"
        if not self.user:
            logger.info("[GameRoom.connect]: anonymous user tried to join game room {%s}", self.game_room_id)
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        game_room_qs: GameRoom = GameRoom.objects.for_id(self.game_room_id)
        if not game_room_qs.exists():
            logger.info(
                "[GameRoom.connect]: user {%s} tried to join non-existant game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        self.game_room: GameRoom = game_room_qs.for_players(self.user.profile).for_ongoing_status().first()
        if not self.game_room:
            logger.info(
                "[GameRoom.connect]: illegal user {%s} tried to join game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        self.player = GameRoomPlayer.objects.filter(profile=self.user.profile, game_room=self.game_room).first()
        logger.info(
            "[GameRoom.connect]: user {%s} successefully joined game room {%s}. Player id of the user is {%s}",
            self.user.profile,
            self.game_room_id,
            str(self.player.id),
        )
        self.accept()
        profile = self.user.profile
        player_id = str(self.player.id)
        async_to_sync(self.channel_layer.group_add)(self.game_room_group_name, self.channel_name)
        async_to_sync(self.channel_layer.group_add)(f"player_{player_id}", self.channel_name)
        async_to_sync(self.channel_layer.send)(
            "game",
            GameServerToGameWorker.PlayerConnected(
                type="player_connected",
                game_room_id=self.game_room_id,
                player_id=player_id,
                profile_id=str(profile.id),
                name=self.user.nickname if self.user.nickname else self.user.username,
                avatar=profile.avatar,
                elo=profile.elo,
            ),
        )

    def disconnect(self, close_code):
        if close_code != PongCloseCodes.ILLEGAL_CONNECTION:
            async_to_sync(self.channel_layer.group_discard)(self.game_room_group_name, self.channel_name)
            async_to_sync(self.channel_layer.group_discard)(f"player_{str(self.player.id)}", self.channel_name)
        # TODO: put close code to enum, make it prettier
        ok_close_code = 3000
        if close_code == ok_close_code:
            return

        if self.player:
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
    def game_cancelled(self, _: dict):
        """
        Event handler for `game_cancelled`.
        `game_cancelled` is sent from the game worker to this consumer when players fail to connect to the game.
        """
        self.send(text_data=json.dumps({"action": "game_cancelled"}))
        self.close(PongCloseCodes.CANCELLED)

    def player_joined(self, event: GameServerToClient.PlayerJoined):
        print(event)
        player_id = event["player_id"]
        player_number = event["player_number"]
        self.send(
            text_data=json.dumps(
                GameServerToClient.PlayerJoined(
                    action="player_joined",
                    player_id=player_id,
                    player_number=player_number,
                ),
            ),
        )

    def game_started(self, _: dict):
        """
        Event handler for `game_started`.
        `game_started` is sent from the game worker to this consumer when both players connected to the game.
        """
        self.send(text_data=json.dumps({"action": "game_started"}))

    def state_updated(self, event: dict):
        """
        Event handler for `state_updated`.
        `state_updated` is sent from the game worker to this consumer on each game tick.
        """
        self.send(text_data=json.dumps({"action": "state_updated", "state": event["state"]}))

    def game_paused(self, event: dict):
        """
        Event handler for `game_paused`.
        `game_paused` is sent from the game worker to this consumer when the game unters the paused state.
        """
        self.send(
            text_data=json.dumps(
                {"action": "game_paused", "remaining_time": event["remaining_time"], "name": event["name"]},
            ),
        )

    def game_unpaused(self, _: dict):
        """
        Event handler for `game_unpaused`.
        `game_unpaused` is sent from the game worker to this consumer when the game unters the paused state.
        """
        self.send(text_data=json.dumps({"action": "game_unpaused"}))

    def player_won(self, event: dict):
        """
        Event handler for `player_won`.
        `player_won` is sent from the game worker to this consumer when the game is ended and one of the players won
        the game.
        """
        self.send(
            text_data=json.dumps(
                {
                    "action": "player_won",
                    "winner": event["winner"],
                    "loser": event["loser"],
                    "elo_change": event["elo_change"],
                },
            ),
        )
        self.close(PongCloseCodes.NORMAL_CLOSURE)

    def player_resigned(self, event: dict):
        """
        Event handler for `player_resigned`.
        `player_resigned` is sent from the game worker to this consumer when one the players resigned,
        by disconnect, for example.
        """
        self.send(
            text_data=json.dumps(
                {
                    "action": "player_won",
                    "winner": event["winner"],
                    "loser": event["loser"],
                    "elo_change": event["elo_change"],
                },
            ),
        )
        self.close(PongCloseCodes.NORMAL_CLOSURE)

    def movement_confirmed(self, event: GameServerToClient.InputConfirmed):
        print(event)
        self.send(text_data=json.dumps(event))
