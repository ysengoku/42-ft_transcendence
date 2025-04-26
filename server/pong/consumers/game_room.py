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

        self.game_room: GameRoom = GameRoom.for_id(self.game_room_id).for_players(self.user.profile).first()
        if self.game_room is None:
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
        self.channel_layer.group_add(self.game_room_group_name, self.channel_name)
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
        self.channel_layer.group_discard(self.game_room_group_name, self.channel_name)

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
