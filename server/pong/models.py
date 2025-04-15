import uuid
from datetime import datetime

from django.db import models
from django.db.models import Case, Count, F, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import TruncDate
from django.utils import timezone

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

    def resolve(
        self,
        winner: Profile,
        loser: Profile,
        winners_score: int,
        losers_score: int,
        date: datetime = timezone.now(),
    ):
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        """
        elo_change = _calculate_elo_change(winner.elo, loser.elo, MatchQuerySet.WIN, MatchQuerySet.K_FACTOR)
        if (loser.elo - elo_change) < MatchQuerySet.MINUMUM_ELO:
            elo_change = loser.elo - MatchQuerySet.MINUMUM_ELO
        elif (winner.elo + elo_change) > MatchQuerySet.MAXIMUM_ELO:
            elo_change = MatchQuerySet.MAXIMUM_ELO - winner.elo
        winner.elo += elo_change
        loser.elo -= elo_change
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
        return resolved_match

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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True, blank=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True, blank=True)
    winners_score = models.IntegerField()
    losers_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField()
    losers_elo = models.IntegerField()
    date = models.DateTimeField(default=timezone.now)

    objects = MatchQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "matches"
        ordering = ["-date"]

    def __str__(self) -> str:
        winner = self.winner.user.username if self.winner else "Deleted User"
        loser = self.loser.user.username if self.loser else "Deleted User"
        return f"{winner} - {loser}"


class GameRoomManager(models.Manager):
    def get_valid_game_room(self):
        """
        Valid game room is a pending game room with less than 2 players.
        """
        return (
            self.filter(status=GameRoom.PENDING)
            .annotate(players_num=Count("players"))
            .filter(players_num__lt=2)
            .first()
        )


class GameRoom(models.Model):
    """
    Gets created when user starts matchmaking search.
    """

    PENDING = "pending"
    CLOSED = "closed"
    STATUS_CHOICES = (
        (PENDING, "Pending"),
        (CLOSED, "Closed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=7, choices=STATUS_CHOICES, default="pending")
    players = models.ManyToManyField(Profile, related_name="game_rooms")
    date = models.DateTimeField(default=timezone.now)

    objects = GameRoomManager()

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.get_status_display()} match {str(self.id)}"

    def close(self):
        self.status = GameRoom.CLOSED
        self.save()
