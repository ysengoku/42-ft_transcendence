import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from pong.models import GameRoom

"""
flowchart
    1[User clicks "Find match"] --> 2[Establishes websocket connection to /ws/matchmaking]
    3 --> 4[Finds or creates game room]
    4 --> 5[Waits for another player]
    5 -->
        6[Disconnects] --> 7[The player is removed from the queue]
            --> 8[If there are players in the room, do nothing]
            --> 9[If there are no players in the room, close the room]
        10[Player is found] --> 11[Players are redirected to the game route]
"""
logger = logging.getLogger("server")


PLAYERS_REQUIRED = 2


class MatchmakingConsumer(WebsocketConsumer):
    def connect(self):
        ###########################
        async_to_sync(self.channel_layer.send)(
            "game",
            {
                "type": "worker.game",
            },
        )
        ###########################
        self.user = self.scope.get("user")
        if not self.user:
            self.game_room = None
            self.close()
            return
        self.accept()

        self.game_room = GameRoom.objects.get_valid_game_room()
        if not self.game_room:
            self.game_room = GameRoom.objects.create()
            logger.info("[Matchmaking.connect]: game room {%s} was created", self.game_room)

        self.game_room.players.add(self.user.profile)
        logger.info("[Matchmaking.connect]: game room {%s} added profile {%s}", self.game_room, self.user.profile)

        self.group_name = f"game_room_{self.game_room.id}"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)

        if self.game_room.players.count() == PLAYERS_REQUIRED:
            logger.info("[Matchmaking.connect]: game room {%s} both players were found")
            self.game_room.close()
            async_to_sync(self.channel_layer.group_send)(self.group_name, {"type": "matchmaking.players_found"})

    def disconnect(self, code: int):
        if not self.game_room:
            return

        self.game_room.players.remove(self.user.profile)
        logger.info("[Matchmaking.disconnect]: game room {%s} removed player {%s}", self.game_room, self.user.profile)
        if self.game_room.players.count() < 1:
            self.game_room.close()
            logger.info("[Matchmaking.disconnect]: game room {%s} closed", self.game_room)

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        match action:
            case "cancel":
                logger.info(
                    "[Matchmaking.cancel]: player {%s} sent cancel event to game room {%s}",
                    self.user.profile,
                    self.game_room,
                )
                self.close()

    def matchmaking_players_found(self, event):
        opponent = self.game_room.players.exclude(user=self.user).first()
        self.send(text_data=json.dumps({
            "action": "game_found",
            "game_room_id": str(self.game_room.id),
            "username": opponent.user.username,
            "nickname": opponent.user.nickname,
            "avatar": opponent.avatar,
        }))
