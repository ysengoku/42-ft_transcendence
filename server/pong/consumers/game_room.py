import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from pong.models import GameRoom, GameRoomPlayer

logger = logging.getLogger("server")


class GameRoomConsumer(WebsocketConsumer):
    def connect(self):
        self.player = None
        self.user = self.scope.get("user")
        self.game_room_id = self.scope["url_route"]["kwargs"]["game_room_id"]
        self.game_room_group_name = f"game_room_{self.game_room_id}"
        if not self.user:
            logger.info("[GameRoom.connect]: anonymous user tried to join game room {%s}", self.game_room_id)
            self.close()
            return

        game_room_qs: GameRoom = GameRoom.objects.for_id(self.game_room_id)
        if not game_room_qs.exists():
            logger.info(
                "[GameRoom.connect]: user {%s} tried to join non-existant game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close()
            return

        self.game_room: GameRoom = game_room_qs.for_players(self.user.profile).for_ongoing_status().first()
        if not self.game_room:
            logger.info(
                "[GameRoom.connect]: illegal user {%s} tried to join game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close()
            return

        self.player = GameRoomPlayer.objects.filter(profile=self.user.profile, game_room=self.game_room).first()
        logger.info(
            "[GameRoom.connect]: user {%s} successefully joined game room {%s}. Player id of the user is {%s}",
            self.user.profile,
            self.game_room_id,
            str(self.player.id),
        )
        self.accept()
        async_to_sync(self.channel_layer.group_add)(self.game_room_group_name, self.channel_name)
        self.send(text_data=json.dumps({"event": "joined", "player_id": str(self.player.id)}))
        async_to_sync(self.channel_layer.send)(
            "game",
            {
                "game_room_id": self.game_room_id,
                "player_id": str(self.player.id),
                "type": "player_connected",
            },
        )

    def disconnect(self, close_code):
        # TODO: put close code to enum, make it prettier
        if close_code == 3000:
            return

        if self.player:
            async_to_sync(self.channel_layer.send)(
                "game",
                {
                    "game_room_id": self.game_room_id,
                    "player_id": str(self.player.id),
                    "type": "player_disconnected",
                },
            )
            logger.info(
                "[GameRoom.disconnect]: player {%s} has left game room {%s}", self.user.profile, self.game_room_id,
            )
            async_to_sync(self.channel_layer.group_discard)(self.game_room_group_name, self.channel_name)

    def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            logger.info(
                "[GameRoom.receive]: user {%s} sent invalid json to the game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            return

        match text_data_json:
            case {
                "action": "move_left" | "move_right" as action,
                "content": bool(content),
                "player_id": str(player_id),
            }:
                async_to_sync(self.channel_layer.send)(
                    "game",
                    {
                        "game_room_id": self.game_room_id,
                        "player_id": player_id,
                        "action": action,
                        "content": content,
                        "type": "player_inputed",
                    },
                )

            case _:
                logger.info(
                    "[GameRoom.receive]: user {%s} sent invalid action to the game room {%s}",
                    self.user.profile,
                    self.game_room_id,
                )

    ##############################
    # GAME WORKER EVENT HANDLERS #
    ##############################
    def state_updated(self, event: dict):
        """
        Event handler for `state_updated`.
        `state_updated` is sent from the game worker to this consumer on each game tick.
        """
        self.send(
            text_data=json.dumps(
                {
                    "event": "game_tick",
                    "state": event["state"],
                },
            ),
        )

    def resignation(self, event: dict):
        """
        Event handler for `resignation`.
        `resignation` is sent from the game worker to this consumer when one the players resigned,
        by disconnect, for example.
        """
        self.send(
            text_data=json.dumps(
                {
                    "event": "resignation",
                    "winner": event["winner"],
                },
            ),
        )

    def game_cancelled(self, _: dict):
        """
        Event handler for `game_cancelled`.
        `game_cancelled` is sent from the game worker to this consumer when players fail to connect to the game.
        """
        self.send(
            text_data=json.dumps(
                {
                    "event": "game_cancelled",
                },
            ),
        )
        # TODO: add close codes to enum
        self.close(3000)
