import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.db import transaction

from pong.models import GameRoom, GameRoomPlayer

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
    def _with_db_lock_find_valid_game_room(self):
        """
        Filter game rooms according to requirements, without locking (due to annotations in .for_valid_game_room).
        If room was found, use it's id to get an actually locked room.
        Revalidate it.
        """
        candidate_room = GameRoom.objects.for_valid_game_room().first()
        if candidate_room:
            locked_candidate_room = (
                GameRoom.objects.select_for_update().filter(id=candidate_room.id, status=GameRoom.PENDING).first()
            )
            if locked_candidate_room and locked_candidate_room.players.count() < PLAYERS_REQUIRED:
                return locked_candidate_room
        return None

    def connect(self):
        """
        On connection, join existing pending game room with less than two players, or create a new one.
        Pending game rooms always have at least one player.
        To avoid race condition, locks the GameRoom and related objects with `.select_for_update()`.
        Unfortunately, annotated objects cannot be locked, so `for_valid_game_room`, which uses them to find the
        conforming room. The room is the re-fetched so to say, and revalidated.
        """
        self.user = self.scope.get("user")
        self.game_room = None
        if not self.user:
            self.close()
            return

        self.accept()

        # transaction.atomic and .select_for_update are needed to prevent possible race condition
        with transaction.atomic():
            self.game_room = self._with_db_lock_find_valid_game_room()

            if self.game_room:
                GameRoomPlayer.objects.create(game_room=self.game_room, profile=self.user.profile)
                logger.info(
                    "[Matchmaking.connect]: game room {%s} added profile {%s}",
                    self.game_room,
                    self.user.profile,
                )
            else:
                self.game_room = GameRoom.objects.create()
                GameRoomPlayer.objects.create(game_room=self.game_room, profile=self.user.profile)
                logger.info("[Matchmaking.connect]: game room {%s} was created", self.game_room)

            self.matchmaking_group_name = f"matchmaking_{self.game_room.id}"
            async_to_sync(self.channel_layer.group_add)(self.matchmaking_group_name, self.channel_name)

            if self.game_room.players.count() == PLAYERS_REQUIRED:
                logger.info("[Matchmaking.connect]: game room {%s} both players were found")
                self.game_room.close()
                async_to_sync(self.channel_layer.group_send)(
                    self.matchmaking_group_name, {"type": "matchmaking_players_found"},
                )

    def disconnect(self, code: int):
        if not self.game_room:
            return

        normal_close_code = 1000
        async_to_sync(self.channel_layer.group_discard)(self.matchmaking_group_name, self.channel_name)
        if code == normal_close_code:
            logger.info(
                "[Matchmaking.disconnect]: players were found for game room {%s}, connection is closed normally",
                self.game_room,
            )
            return

        with transaction.atomic():
            room_to_clean = GameRoom.objects.select_for_update().filter(id=self.game_room.id).first()
            room_to_clean.players.remove(self.user.profile)
            logger.info(
                "[Matchmaking.disconnect]: game room {%s} removed player {%s}",
                room_to_clean,
                self.user.profile,
            )
            if self.game_room.players.count() < 1:
                room_to_clean.close()
                logger.info("[Matchmaking.disconnect]: game room {%s} closed", room_to_clean)

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
        logger.info("[Matchmaking.players_found]: {%s} vs {%s}", self.user.profile, opponent)
        self.game_room.status = GameRoom.ONGOING
        self.game_room.save()
        self.send(
            text_data=json.dumps(
                {
                    "action": "game_found",
                    "game_room_id": str(self.game_room.id),
                    "username": opponent.user.username,
                    "nickname": opponent.user.nickname,
                    "avatar": opponent.avatar,
                },
            ),
        )
        self.close(1000)
