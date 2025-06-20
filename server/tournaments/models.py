from __future__ import annotations

import uuid
from typing import Literal

from channels.db import database_sync_to_async
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Prefetch, Q
from django.utils import timezone

from pong.game_protocol import GameRoomSettings
from pong.models import GameRoom, get_default_game_room_settings
from users.models import Profile


class Participant(models.Model):
    PENDING = "pending"
    PLAYING = "playing"
    QUALIFIED = "qualified"
    ELIMINATED = "eliminated"
    WINNER = "winner"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (PLAYING, "Playing"),
        (QUALIFIED, "Qualified"),
        (ELIMINATED, "Eliminated"),
        (WINNER, "Winner"),
    ]

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    tournament = models.ForeignKey("Tournament", on_delete=models.CASCADE, related_name="participants")
    alias = models.CharField(max_length=settings.MAX_ALIAS_LENGTH)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=PENDING)
    current_round = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("profile", "tournament"), ("tournament", "alias"))

    def __str__(self):
        return f"{self.alias} ({self.tournament.name})"


class TournamentQuerySet(models.QuerySet):
    def validate_and_create(
        self,
        creator: Profile,
        tournament_name: str,
        required_participants: int,
        alias: str,
        settings: GameRoomSettings,
    ):
        tournament = self.model(
            name=tournament_name,
            creator=creator,
            required_participants=required_participants,
            status=self.model.PENDING,
            settings=settings,
        )
        tournament.full_clean()
        tournament.save()
        tournament.add_participant(creator, alias)
        return tournament

    def get_active_tournament(self, profile: Profile) -> None | Tournament:
        """Gets the active tournament where user is still a playing participant."""
        participant: Participant = Participant.objects.filter(
            ~Q(status__in=[Participant.PENDING, Participant.PLAYING]),
            tournament__status__in=[self.model.PENDING, self.model.ONGOING],
            profile=profile,
        ).first()
        if participant:
            return participant.tournament
        return None


class Tournament(models.Model):
    PENDING = "pending"
    ONGOING = "ongoing"
    FINISHED = "finished"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ONGOING, "Ongoing"),
        (FINISHED, "Finished"),
        (CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    creator = models.ForeignKey(Profile, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    winner = models.ForeignKey(
        Participant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="won_tournaments",
    )
    required_participants = models.PositiveIntegerField()
    settings = models.JSONField(verbose_name="Settings", default=get_default_game_room_settings)

    objects: TournamentQuerySet = TournamentQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"

    def clean(self):
        num = self.required_participants
        options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if num not in options:
            raise ValidationError({"required_participants": [f"Number of participants must be one of: {options}"]})

    def get_rounds(self):
        return self.rounds.all().prefetch_related("brackets")

    def get_prefetched(self):
        return Tournament.objects.prefetch_related(
            Prefetch("tournament_participants", queryset=Participant.objects.select_related("profile__user")),
            Prefetch("tournament_rounds", queryset=Round.objects.prefetch_related("brackets")),
        ).get(pk=self.pk)

    def add_participant(self, profile: Profile, alias: str | None = None) -> Participant | str:
        """Returns a Participant instance if everything is good, error string otherwise."""
        participant_alias = alias if alias else profile.user.nickname
        if self.is_alias_occupied(alias):
            return "Someone with that alias is already in the tournament."

        if self.has_participant(profile):
            return "You are already registered for this tournament."

        participant = Participant(
            profile=profile,
            alias=participant_alias,
            tournament=self,
        )
        participant.save()
        return participant

    def remove_participant(self, profile: Profile) -> dict | str:
        """Returns a dict if everything is good, error string otherwise."""
        participant = Participant.objects.filter(tournament=self, profile=profile).first()
        if not participant:
            return "No participant was found in this tournament."

        return participant.delete()

    def is_alias_occupied(self, alias: str):
        return self.participants.filter(alias=alias).exists()

    def has_participant(self, profile: Profile):
        return self.participants.filter(profile=profile).exists()


class Round(models.Model):
    PENDING = "pending"
    ONGOING = "ongoing"
    FINISHED = "finished"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ONGOING, "Ongoing"),
        (FINISHED, "Finished"),
    ]

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    number = models.PositiveIntegerField(editable=False)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=PENDING,
    )

    class Meta:
        unique_together = ("tournament", "number")
        ordering = ["number"]

    def __str__(self):
        return f"Round {self.number} - {self.tournament.name}"


class BracketQuerySet(models.QuerySet):
    async def async_update_finished_bracket(
        self,
        bracket_id: int,
        winner_profile_id: int,
        winners_score: int,
        losers_score: int,
        status: Literal["finished", "cancelled"],
    ) -> None | Bracket:
        """
        Method for updated a Bracket with the data of a finished game.
        Meant to be used by the game server.
        """
        bracket: Bracket = await database_sync_to_async(self.get)(id=bracket_id)
        if status == "finished":
            winner_participant: Participant = await database_sync_to_async(Participant.objects.get)(
                profile__id=winner_profile_id,
            )
            bracket.winners_score = winners_score
            bracket.losers_score = losers_score
            bracket.winner = winner_participant
            bracket.status = status
        elif status == "cancelled":
            bracket.winner = None
            bracket.status = status
        await database_sync_to_async(bracket.save)()
        return bracket


class Bracket(models.Model):
    PENDING = "pending"
    ONGOING = "ongoing"
    FINISHED = "finished"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ONGOING, "Ongoing"),
        (FINISHED, "Finished"),
        (CANCELLED, "Cancelled"),
    ]

    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="brackets")
    participant1 = models.ForeignKey(Participant, on_delete=models.CASCADE, related_name="brackets_p1")
    participant2 = models.ForeignKey(Participant, on_delete=models.CASCADE, related_name="brackets_p2")
    winners_score = models.PositiveIntegerField(default=0)
    losers_score = models.PositiveIntegerField(default=0)
    winner = models.ForeignKey(Participant, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    score = models.CharField(max_length=7, blank=True)
    game_room = models.OneToOneField(GameRoom, on_delete=models.CASCADE, null=True, blank=True)

    objects: BracketQuerySet = BracketQuerySet.as_manager()

    def __str__(self):
        return f"{self.participant1.alias} vs {self.participant2.alias} - Round {self.round.number}"
