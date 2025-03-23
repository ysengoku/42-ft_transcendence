import uuid

from django.db import models

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


class MatchManager(models.Manager):
    MINUMUM_ELO = 100
    K_FACTOR = 32
    WIN = 1
    DRAW = 0.5
    LOSS = 0

    def resolve(self, winner: Profile, loser: Profile, winners_score: int, losers_score: int):
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        """
        elo_change = _calculate_elo_change(winner.elo, loser.elo, MatchManager.WIN, MatchManager.K_FACTOR)
        if (loser.elo - elo_change) < MatchManager.MINUMUM_ELO:
            elo_change = loser.elo - MatchManager.MINUMUM_ELO
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
        )
        resolved_match.save()
        winner.save()
        loser.save()
        return resolved_match


class Match(models.Model):
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True, blank=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True, blank=True)
    winners_score = models.IntegerField()
    losers_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField()
    losers_elo = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)

    objects = MatchManager()

    class Meta:
        verbose_name_plural = "matches"
        ordering = ["-date"]

    def __str__(self) -> str:
        winner = self.winner.user.username if self.user else "Deleted User"
        loser = self.loser.user.username if self.user else "Deleted User"
        return f"{winner} - {loser}"


class PendingMatch(models.Model):
    """
    elo_range_level defines which range of elo is acceptable for finding an opponent.
    For example, if the level is 1, it means that if the player has 1000 elo, opponents with 900-1100 elo are viable.
    """

    PENDING = "pending"
    MATCHED = "matched"
    EXPIRED = "expired"
    STATUS_CHOICES = (
        (PENDING, "Pending"),
        (MATCHED, "Matched"),
        (EXPIRED, "Expired"),
    )

    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3
    LEVEL_4 = 4
    LEVEL_5 = 5
    LEVEL_CHOICES = (
        (LEVEL_1, "Level 1"),  # Within 100 elo range
        (LEVEL_2, "Level 2"),  # Within 200 elo range
        (LEVEL_3, "Level 3"),  # Within 400 elo range
        (LEVEL_4, "Level 4"),  # Within 800 elo range
        (LEVEL_5, "Level 5"),  # Every opponent is viable
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=7, choices=STATUS_CHOICES, default="pending")
    elo_range_level = models.IntegerField(choices=LEVEL_CHOICES)
    player = models.OneToOneField(Profile, on_delete=models.CASCADE)

    def __str__(self) -> str:
        return f"{self.get_status_display()} match {str(self.id)}"
