import uuid
from datetime import datetime
from urllib.parse import parse_qs

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import models, transaction
from django.db.models import Case, Count, F, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import TruncDate
from django.utils import timezone

from pong.game_protocol import GameRoomSettings
from users.models.profile import Profile


def _calculate_expected_score(a: int, b: int) -> float:
    """
    Calculates probability of player with rating a winning against player with rating b.
    The result is a number between 0 and 1. Rounded to 2 digis for clarity.
    """
    return round(1 / (1 + 10 ** ((b - a) / 400)), 2)


def _calculate_elo_change(a: int, b: int, outcome: float, k_factor: int = 32) -> int:
    """
    Calculates the elo diff betwenn players with rating a and rating b, given the outcome.
    Outcome can be 1, 0.5 or 0, which are win, draw or loss for player a.
    """
    expected_score = _calculate_expected_score(a, b)

    return round(k_factor * (outcome - expected_score))


class MatchQuerySet(models.QuerySet):
    def calculate_elo_change_for_players(self, winner_elo: int, loser_elo: int) -> tuple[int, int, int]:
        elo_change = _calculate_elo_change(winner_elo, loser_elo, self.model.WIN, self.model.K_FACTOR)
        if (loser_elo - elo_change) < self.model.MINIMUM_ELO:
            elo_change = loser_elo - self.model.MINIMUM_ELO
        elif (winner_elo + elo_change) > self.model.MAXIMUM_ELO:
            elo_change = self.model.MAXIMUM_ELO - winner_elo
        winner_elo += elo_change
        loser_elo -= elo_change
        return winner_elo, loser_elo, elo_change

    def resolve(
        self,
        winner_profile_or_id: Profile | int,
        loser_profile_or_id: Profile | int,
        winners_score: int,
        losers_score: int,
        date: datetime | None = None,
        ranked: bool = True,
        should_save: bool = True,
    ) -> tuple["Match", Profile, Profile] | None:
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        Accepts either model instances directly or their ID's.
        Returns resolved match, winner and loser model instances.
        """
        if date is None:
            date = timezone.now()

        if isinstance(winner_profile_or_id, int):
            winner: Profile = Profile.objects.filter(id=winner_profile_or_id).first()
            if not winner:
                return None
        else:
            winner: Profile = winner_profile_or_id

        if isinstance(loser_profile_or_id, int):
            loser: Profile = Profile.objects.filter(id=loser_profile_or_id).first()
            if not loser:
                return None
        else:
            loser: Profile = loser_profile_or_id

        if ranked:
            winners_elo, losers_elo, elo_change = self.calculate_elo_change_for_players(winner.elo, loser.elo)
        else:
            winners_elo, losers_elo, elo_change = winner.elo, loser.elo, 0
        winner.elo = winners_elo
        loser.elo = losers_elo

        with transaction.atomic():
            resolved_match: Match = Match(
                winner=winner,
                loser=loser,
                winners_score=winners_score,
                losers_score=losers_score,
                elo_change=elo_change,
                winners_elo=winners_elo,
                losers_elo=losers_elo,
                date=date,
            )

            if should_save:
                resolved_match.save()
                Profile.objects.bulk_update([winner, loser], ["elo"])

        return resolved_match, winner, loser

    def get_elo_points_by_day(self, profile: Profile):
        # annotate with day without time and elo change of the specific player
        player_elo_qs = self.filter(Q(winner=profile) | Q(loser=profile)).annotate(
            day=TruncDate("date"),
            player_elo=Case(
                When(winner=profile, then=F("winners_elo")),
                When(loser=profile, then=F("losers_elo")),
                default=0,
            ),
            player_elo_change=Case(
                When(winner=profile, then=F("elo_change")),
                When(loser=profile, then=-F("elo_change")),
                default=0,
            ),
        )

        # takes the last match for each day to determine the end result of elo for this specific day
        latest_match_per_day_subquery = (
            player_elo_qs.filter(day=OuterRef("day")).order_by("-date").values("player_elo")[:1]
        )

        return (
            player_elo_qs.values("day")
            .annotate(
                daily_elo_change=Sum("player_elo_change"),
                elo_result=Subquery(latest_match_per_day_subquery),
            )
            .order_by("-day")
        )

    def get_match_preview(self, profile: Profile):
        def create_opponent_subquery(loser_or_winner: str):
            return self.filter(pk=OuterRef("pk")).values(
                f"{loser_or_winner}__pk",
            )[:1]

        return self.filter(Q(winner=profile) | Q(loser=profile)).annotate(
            elo_result=Case(
                When(winner=profile, then=F("winners_elo")),
                When(loser=profile, then=F("losers_elo")),
                default=0,
            ),
            is_winner=Case(When(winner=profile, then=Value(True)), default=Value(False)),
            opponent_pk=Case(
                When(winner=profile, then=Subquery(create_opponent_subquery("loser"))),
                When(loser=profile, then=Subquery(create_opponent_subquery("winner"))),
            ),
        )


class Match(models.Model):
    """Represents a finished match between two players."""

    MINIMUM_ELO = 100
    MAXIMUM_ELO = 3000
    K_FACTOR = 32
    WIN = 1
    DRAW = 0.5
    LOSS = 0

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True, blank=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True, blank=True)
    winners_score = models.IntegerField()
    losers_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField()
    losers_elo = models.IntegerField()
    date = models.DateTimeField(default=timezone.now)

    objects: MatchQuerySet = MatchQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "matches"
        ordering = ["-date"]

    def __str__(self) -> str:
        winner = self.winner.user.username if self.winner else "Deleted User"
        loser = self.loser.user.username if self.loser else "Deleted User"
        return f"{winner} - {loser}"


class GameRoomPlayer(models.Model):
    """Intermediate model for GameRoom and Profile, storing room-specific player data."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    game_room = models.ForeignKey("GameRoom", on_delete=models.CASCADE)
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    number_of_connections = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.profile.user.username} in Room {self.game_room.id}"

    def inc_number_of_connections(self) -> int:
        self.number_of_connections = F("number_of_connections") + 1
        self.save()
        self.refresh_from_db()
        return self.number_of_connections

    def dec_number_of_connections(self) -> int:
        if self.number_of_connections > 0:
            self.number_of_connections = F("number_of_connections") - 1
            self.save()
            self.refresh_from_db()
        return self.number_of_connections


class GameRoomQuerySet(models.QuerySet):
    def for_settings(self, settings: GameRoomSettings) -> models.QuerySet:
        """
        Returns a QuerySet based on the GameRoomSettings. Excludes all the game rooms with conflicting settings.
        """
        compatible_settings_query = Q()
        for key, value in settings.items():
            compatible_settings_query &= ~Q(settings__has_key=key) | Q(settings__contains={key: value})

        return self.filter(compatible_settings_query)

    def for_valid_game_room(self, profile: Profile, settings: GameRoomSettings):
        """Valid game room is a pending game room with less than 2 players."""
        return (
            self.annotate(players_count=Count("players"))
            .filter(
                status=GameRoom.PENDING,
                players_count__lt=2,
            )
            .for_settings(settings)
        )

    def for_id(self, game_room_id: str):
        try:
            return self.filter(id=game_room_id)
        # check if the game_room_id is valid UUID
        except ValidationError:
            return self.none()

    def for_players(self, *players: Profile):
        return self.filter(players__in=players)

    def for_ongoing_status(self):
        return self.filter(status=self.model.ONGOING)

    def for_pending_or_ongoing_status(self):
        return self.filter(Q(status=self.model.PENDING) | Q(status=self.model.ONGOING))


def get_default_game_room_settings() -> GameRoomSettings:
    """Create the game settings for the default Pong experience."""
    return GameRoomSettings(
        score_to_win=5,
        time_limit=3,
        cool_mode=False,
        ranked=False,
        game_speed="medium",
    )


class GameRoom(models.Model):
    """
    Represents a game room where the players either look for an opponent or play a match.
    Created after successeful matchmaking and used by the GameServerConsumer and GameWorkerConsumer.
    Game settings are of the type GameRoomSettings. There are default settings, and the MatchmakingConsumer
    will fill the fields that were not specified by the user with default values.
    """

    PENDING = "pending"
    ONGOING = "ongoing"
    CLOSED = "closed"
    STATUS_CHOICES = (
        (PENDING, "Pending"),
        (ONGOING, "Ongoing"),
        (CLOSED, "Closed"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=7, choices=STATUS_CHOICES, default="pending")
    players = models.ManyToManyField(Profile, related_name="game_rooms", through=GameRoomPlayer)
    date = models.DateTimeField(default=timezone.now)
    settings = models.JSONField(verbose_name="Settings", default=get_default_game_room_settings)

    objects: GameRoomQuerySet = GameRoomQuerySet.as_manager()

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.get_status_display()} match {str(self.id)} with settings: {self.settings}"

    def resolve_settings(self, other_settings: GameRoomSettings):
        """
        Resolves settings of this game room player set by the creator with the non conflicting game room settings
        of the other player in the game room.
        """
        default_game_room_settings = get_default_game_room_settings()
        initial_settings = dict(self.settings)
        new_settings = {}
        for key in default_game_room_settings:
            if key in initial_settings:
                new_settings[key] = initial_settings[key]
            elif key in other_settings:
                new_settings[key] = other_settings[key]
            else:
                new_settings[key] = default_game_room_settings[key]
        self.settings = new_settings
        self.save()
        return self

    def set_closed(self):
        self.status = GameRoom.CLOSED
        self.save()
        return self

    def add_player(self, profile: Profile):
        return GameRoomPlayer.objects.create(game_room=self, profile=profile)

    def set_ongoing(self):
        self.status = self.ONGOING
        self.save()
        return self

    def has_player(self, profile: Profile):
        return self.players.filter(id=profile.id).exists()

    def is_in_tournament(self) -> bool:
        """Checks if the game room is a part of some running tournament."""
        try:
            return self.bracket is not None
        except ObjectDoesNotExist:
            return False

    @staticmethod
    def decode_game_room_settings_uri_query(
        query_string: str,
        default_game_room_settings: None | GameRoomSettings = None,
    ) -> GameRoomSettings:
        """
        Decodes the game room settings from the query string, converts the data to the correct type.
        """
        if not default_game_room_settings:
            default_game_room_settings = get_default_game_room_settings()
        if not query_string:
            return default_game_room_settings

        ### DECODING ###
        decoded_game_room_query_parameters: dict = {
            k.decode(): v[0].decode()
            for k, v in parse_qs(query_string, strict_parsing=True, max_num_fields=9, encoding="utf-8").items()
        }

        return decoded_game_room_query_parameters

    @staticmethod
    def handle_game_room_settings_types(
        game_room_settings: dict[str, str],
        default_game_room_settings: None | GameRoomSettings = None,
    ) -> None | GameRoomSettings:
        ### CHECKS FOR KEY NAMES AND VALUES TYPE CORRECTNESS ###
        try:
            if not default_game_room_settings:
                default_game_room_settings = get_default_game_room_settings()
            result = dict(default_game_room_settings)
            for setting_key, setting_value in game_room_settings.items():
                if setting_key not in default_game_room_settings:
                    return None

                # if the value is "any", it means that the user does not care and we delete the key altogether
                if setting_value == "any":
                    del result[setting_key]
                    continue

                setting_type = type(default_game_room_settings[setting_key])
                if setting_type is bool:
                    result[setting_key] = setting_value and setting_value.lower() != "false"
                else:
                    result[setting_key] = setting_type(setting_value)

            if "game_speed" in result and result["game_speed"] not in [
                "slow",
                "medium",
                "fast",
            ]:
                return None

            provided_time_limit = result.get("time_limit")
            min_time_limit = 1
            max_time_limit = 5
            if provided_time_limit is not None and (
                provided_time_limit < min_time_limit or provided_time_limit > max_time_limit
            ):
                return None

            provided_score_to_win = result.get("score_to_win")
            min_score_to_win = 3
            max_score_to_win = 20
            if provided_score_to_win is not None and (
                provided_score_to_win < min_score_to_win or provided_score_to_win > max_score_to_win
            ):
                return None

            return result
        except ValueError:
            return None
