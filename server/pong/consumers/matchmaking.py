import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.db import transaction

from pong.consumers.common import PongCloseCodes
from pong.models import GameRoom, GameRoomPlayer

logger = logging.getLogger("server")


PLAYERS_REQUIRED = 2


class MatchmakingConsumer(WebsocketConsumer):
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
            logger.info("[Matchmaking.connect]: anonymous user tried to start matchmaking")
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        self.accept()

        with transaction.atomic():
            self.game_room: GameRoom = self._with_db_lock_find_valid_game_room()

            if self.game_room and not self.game_room.has_player(self.user.profile):
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
                    self.matchmaking_group_name,
                    {"type": "matchmaking_players_found"},
                )

    def disconnect(self, code: int):
        """
        When player disconnects from the existing game room, if they are the only player in this room, it closes
        automatically. Connection can also be closed by the server if the matchmaking fullfilled its role and
        found a suitable match.
        `.select_for_update()` ensures no race conditions.
        """
        if not self.game_room or code == PongCloseCodes.ILLEGAL_CONNECTION:
            return

        async_to_sync(self.channel_layer.group_discard)(self.matchmaking_group_name, self.channel_name)
        if code == PongCloseCodes.NORMAL_CLOSURE:
            logger.info(
                "[Matchmaking.disconnect]: players were found for game room {%s}, connection is closed normally",
                self.game_room,
            )
            return

        with transaction.atomic():
            room_to_clean: GameRoom = GameRoom.objects.select_for_update().filter(id=self.game_room.id).first()
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
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            self.close(PongCloseCodes.BAD_DATA)
            logger.warning(
                "[Matchmaking.receive]: user {%s} sent invalid json",
                self.user.profile,
            )
            return

        match text_data_json:
            case {"action": "cancel"}:
                logger.info(
                    "[Matchmaking.cancel]: player {%s} sent cancel event to game room {%s}",
                    self.user.profile,
                    self.game_room,
                )
                self.close(PongCloseCodes.CANCELLED)
            case unknown:
                self.close(PongCloseCodes.BAD_DATA)
                logger.warning(
                    "[Matchmaking.receive]: user {%s} sent an unknown action {%s}",
                    self.user.profile,
                    unknown,
                )

    def matchmaking_players_found(self, event):
        """
        Event handler for `matchmaking_players_found`.
        `matchmaking_players_found` triggers by the matchmaking consumer itself when the second player joins pending
        game room.
        """
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
                    "elo": opponent.elo,
                },
            ),
        )
        self.close(PongCloseCodes.NORMAL_CLOSURE)

    def _with_db_lock_find_valid_game_room(self):
        """
        Filter game rooms according to requirements, without locking (due to annotations in .for_valid_game_room()).
        If room was found, use it's id to get an actually locked room.
        Revalidate it.
        """
        candidate_room = GameRoom.objects.for_valid_game_room(self.user.profile).first()
        if candidate_room:
            locked_candidate_room = (
                GameRoom.objects.select_for_update().filter(id=candidate_room.id, status=GameRoom.PENDING).first()
            )
            if locked_candidate_room and locked_candidate_room.players.count() < PLAYERS_REQUIRED:
                return locked_candidate_room
        return None
