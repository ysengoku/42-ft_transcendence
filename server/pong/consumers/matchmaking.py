import json
import logging
from urllib.parse import parse_qs

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.db import transaction

from pong.game_protocol import GameRoomSettings, MatchmakingToClient, PongCloseCodes
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings

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
        self.game_room: GameRoom | None = None
        self.accept()
        if not self.user:
            logger.warning("[Matchmaking.connect]: unauthorized user tried to start matchmaking")
            self.close(PongCloseCodes.ILLEGAL_CONNECTION)
            return

        if not self.user.profile.can_participate_in_game():
            logger.info("[Matchmaking.connect]: user {%s} is already involved in some game", self.user.profile)
            self.close(PongCloseCodes.ALREADY_IN_GAME)
            return

        self.game_room_settings = self._parse_game_room_settings(self.scope["query_string"])
        if not self.game_room_settings:
            logger.warning("[Matchmaking.connect]: invalid game room settings were given")
            self.close(PongCloseCodes.BAD_DATA)
            return

        with transaction.atomic():
            self.game_room: GameRoom = self._with_db_lock_find_valid_game_room()

            if not self.game_room:
                self.game_room: GameRoom = GameRoom.objects.create(settings=self.game_room_settings)
                game_room_player: GameRoomPlayer = self.game_room.add_player(self.user.profile)
                logger.info("[Matchmaking.connect]: game room {%s} was created", self.game_room)

            elif not self.game_room.has_player(self.user.profile):
                game_room_player: GameRoomPlayer = self.game_room.add_player(self.user.profile)
                logger.info(
                    "[Matchmaking.connect]: game room {%s} added profile {%s}",
                    self.game_room,
                    self.user.profile,
                )

            else:
                game_room_player: GameRoomPlayer = GameRoomPlayer.objects.filter(
                    game_room=self.game_room,
                    profile=self.user.profile,
                ).first()
                game_room_player.inc_number_of_connections()

            logger.info(
                "[Matchmaking.connect]: player {%s} connected to the game room {%s} {%s} times",
                self.user.profile,
                self.game_room,
                game_room_player.number_of_connections,
            )
            self.matchmaking_group_name = f"matchmaking_{self.game_room.id}"
            async_to_sync(self.channel_layer.group_add)(self.matchmaking_group_name, self.channel_name)

            if self.game_room.players.count() == PLAYERS_REQUIRED:
                logger.info("[Matchmaking.connect]: game room {%s} both players were found")
                self.game_room.close()
                async_to_sync(self.channel_layer.group_send)(
                    self.matchmaking_group_name,
                    {"type": "game_found"},
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
            disconnected_player: GameRoomPlayer = GameRoomPlayer.objects.filter(
                game_room=self.game_room,
                profile=self.user.profile,
            ).first()
            disconnected_player.dec_number_of_connections()
            logger.info(
                "[Matchmaking.connect]: player {%s} connected to the game room {%s} {%s} times",
                self.user.profile,
                self.game_room,
                disconnected_player.number_of_connections,
            )
            if disconnected_player.number_of_connections == 0:
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

    def game_found(self, event):
        """
        Event handler for `game_found`.
        `game_found` is triggered by the matchmaking consumer itself when the second player joins pending
        game room.
        """
        opponent: GameRoomPlayer = self.game_room.players.exclude(user=self.user).first()
        self.game_room.status = GameRoom.ONGOING
        self.game_room.save()
        self.send(
            text_data=json.dumps(
                MatchmakingToClient.GameFound(
                    {
                        "action": "game_found",
                        "game_room_id": str(self.game_room.id),
                        "username": opponent.user.username,
                        "nickname": opponent.user.nickname,
                        "avatar": opponent.avatar,
                        "elo": opponent.elo,
                    },
                ),
            ),
        )
        self.close(PongCloseCodes.NORMAL_CLOSURE)
        logger.info("[Matchmaking.game_found]: {%s} vs {%s}", self.user.profile, opponent)

    def _with_db_lock_find_valid_game_room(self):
        """
        Filter game rooms according to requirements, without locking (due to annotations in .for_valid_game_room()).
        If room was found, use it's id to get an actually locked room.
        Revalidate it.
        """
        candidate_room = GameRoom.objects.for_valid_game_room(self.user.profile, self.game_room_settings).first()
        if candidate_room:
            locked_candidate_room: GameRoom | None = (
                GameRoom.objects.select_for_update()
                .filter(id=candidate_room.id, status=GameRoom.PENDING, settings=self.game_room_settings)
                .first()
            )
            if locked_candidate_room and locked_candidate_room.players.count() < PLAYERS_REQUIRED:
                return locked_candidate_room
        return None

    def _parse_game_room_settings(self, query_string) -> GameRoomSettings | None:  # noqa: PLR0911
        """
        Parses the query parameters for the MatchmakingConsumer, extracts their values, sets them to the correct type,
        and checks the correct ranges.

        If the game settings dict is valid, returns it. Otherwise, returns None.
        """
        try:
            game_room_settings = get_default_game_room_settings()
            if not query_string:
                return game_room_settings

            ### DECODING ###
            decoded_game_room_query_parameters: dict = {
                k.decode(): v[0].decode()
                for k, v in parse_qs(query_string, strict_parsing=True, max_num_fields=9, encoding="utf-8").items()
            }

            ### CHECKS FOR KEY NAMES AND VALUES TYPE CORRECTNESS ###
            for setting_key, setting_value in decoded_game_room_query_parameters.items():
                if setting_key not in game_room_settings:
                    return None
                setting_type = type(game_room_settings[setting_key])
                if setting_type is bool:
                    game_room_settings[setting_key] = setting_value and setting_value.lower() != "false"
                else:
                    game_room_settings[setting_key] = setting_type(setting_value)

            ### CHECKS FOR VALUE RANGES CORRECTNESS ###
            if game_room_settings["game_speed"] not in ["slow", "medium", "fast"]:
                return None

            provided_time_limit = game_room_settings["time_limit"]
            min_time_limit = 1
            max_time_limit = 5
            if provided_time_limit < min_time_limit or provided_time_limit > max_time_limit:
                return None

            provided_score_to_win = game_room_settings["score_to_win"]
            min_score_to_win = 3
            max_score_to_win = 20
            if provided_score_to_win < min_score_to_win or provided_score_to_win > max_score_to_win:
                return None

            return game_room_settings
        except ValueError:
            return None
