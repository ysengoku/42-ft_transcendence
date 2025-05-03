import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from pong.models import GameRoom, GameRoomPlayer

logger = logging.getLogger("server")


class GameRoomConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope.get("user")
        self.game_room_id = self.scope["url_route"]["kwargs"]["game_room_id"]
        self.game_room_group_name = f"game_room_{self.game_room_id}"
        if not self.user:
            logger.info("[GameRoom.connect]: anonymous user tried to join game room {%s}", self.game_room_id)
            self.close()
            return

        game_room_qs: GameRoom = GameRoom.for_id(self.game_room_id)
        if not game_room_qs.exists():
            logger.info(
                "[GameRoom.connect]: user {%s} tried to join non-existant game room {%s}",
                self.user.profile,
                self.game_room_id,
            )
            self.close()
            return

        self.game_room: GameRoom = game_room_qs.for_players(self.user.profile).first()
        if not self.game_room:
            logger.info(
                "[GameRoom.connect]: illegal user {%s} tried to join game room {%s}",
                self.user.profile,
                self.game_room.id,
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
        async_to_sync(self.channel_layer.group_send)(
            "game",
            {
                "game_room_id": self.game_room_id,
                "player_id": str(self.player.id),
                "type": "player_connected",
            },
        )
        # TODO: logic of sending data to the game worker

    def disconnect(self, close_code):
        # TODO: logic of sending data to the game worker
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
                async_to_sync(self.channel_layer.group_send)(
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
