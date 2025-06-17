import uuid
from datetime import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
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
    MINUMUM_ELO = 100
    MAXIMUM_ELO = 3000
    K_FACTOR = 32
    WIN = 1
    DRAW = 0.5
    LOSS = 0

    def calculate_elo_change_for_players(self, winner_elo: int, loser_elo: int) -> tuple[int, int, int]:
        elo_change = _calculate_elo_change(winner_elo, loser_elo, MatchQuerySet.WIN, MatchQuerySet.K_FACTOR)
        if (loser_elo - elo_change) < MatchQuerySet.MINUMUM_ELO:
            elo_change = loser_elo - MatchQuerySet.MINUMUM_ELO
        elif (winner_elo + elo_change) > MatchQuerySet.MAXIMUM_ELO:
            elo_change = MatchQuerySet.MAXIMUM_ELO - winner_elo
        winner_elo += elo_change
        loser_elo -= elo_change
        return winner_elo, loser_elo, elo_change

    def resolve(
        self,
        winner_profile_or_id: Profile | int,
        loser_profile_or_id: Profile | int,
        winners_score: int,
        losers_score: int,
        date: datetime = timezone.now(),
    ) -> tuple["Match", Profile, Profile]:
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        Accepts either model instances directly or their ID's.
        Returns resolved match, winner and loser model instances.
        """
        winner: Profile = (
            Profile.objects.get(id=winner_profile_or_id)
            if isinstance(winner_profile_or_id, int)
            else winner_profile_or_id
        )

        loser: Profile = (
            Profile.objects.get(id=loser_profile_or_id) if isinstance(loser_profile_or_id, int) else loser_profile_or_id
        )

        winner_elo, loser_elo, elo_change = self.calculate_elo_change_for_players(winner.elo, loser.elo)
        winner.elo = winner_elo
        loser.elo = loser_elo
        resolved_match = Match(
            winner=winner,
            loser=loser,
            winners_score=winners_score,
            losers_score=losers_score,
            elo_change=elo_change,
            winners_elo=winner.elo,
            losers_elo=loser.elo,
            date=date,
        )
        resolved_match.save()
        winner.save()
        loser.save()
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
    number_of_connections = models.IntegerField(default=1)

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
    def for_valid_game_room(self, profile: Profile, settings: GameRoomSettings):
        """Valid game room is a pending game room with less than 2 players."""
        return self.annotate(players_count=Count("players")).filter(
            status=GameRoom.PENDING,
            players_count__lt=2,
            settings=settings,
        )

    def for_id(self, game_room_id: str):
        return self.filter(id=game_room_id)

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

    def close(self):
        self.status = GameRoom.CLOSED
        self.save()

    def add_player(self, profile: Profile):
        return GameRoomPlayer.objects.create(game_room=self, profile=profile)

    def has_player(self, profile: Profile):
        return self.players.filter(id=profile.id).exists()

    def is_in_tournament(self) -> bool:
        """Checks if the game room is a part of some running tournament."""
        try:
            return self.bracket is not None
        except ObjectDoesNotExist:
            return False
