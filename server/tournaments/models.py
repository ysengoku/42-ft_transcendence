# server/tournament/models.py
import uuid

from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from ninja import Field, Router, Schema
from pydantic import validator

from common.schemas import MessageSchema
from users.models import Profile


class Tournament(models.Model):
    STATUS_CHOICES = [
        ("lobby", "Lobby"),
        ("ongoing", "Ongoing"),
        ("finished", "Finished"),
        ("canceled", "Canceled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    date = models.DateTimeField()
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="lobby")
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    winner = models.ForeignKey(
        "Participant",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="won_tournaments",
    )
    participants = models.ManyToManyField(
        "Participant",
        related_name='tournaments_m2m'
    )
    # rounds = models.ManyToManyField(
    #     "Round",
    #     related_name='tournament_rounds'
    # )
    required_participants = models.PositiveIntegerField()

    def clean(self):
        num = self.required_participants
        options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if num not in options:
            raise ValueError(
                f"Number of participants must be one of: {options}")
        if (
            Tournament.objects.filter(name__iexact=self.name)
            .exclude(pk=self.pk)
            .exists()
        ):
            raise ValidationError(
                "A tournament with this name already exists.")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"

    def get_rounds(self):
        return self.rounds.all().prefetch_related('brackets')

    # def return_tournaments(self):
    #     return self.tournament.all()


class Participant(models.Model):
    STATUS_CHOICES = [
        ("registered", "Registered"),
        ("playing", "Playing"),
        ("eliminated", "Eliminated"),
        ("winner", "Winner"),
        ("unregistered", "Unregistered"),
    ]

    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="tournament_participants"
    )
    alias = models.CharField(max_length=settings.MAX_ALIAS_LENGTH)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default="registered"
    )
    current_round = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("user", "tournament"), ("tournament", "alias"))

    def __str__(self):
        return f"{self.alias} ({self.tournament.name})"


class Round(models.Model):
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="tournament_rounds"
    )
    number = models.PositiveIntegerField(editable=False)
    status = models.CharField(
        max_length=10,
        choices=[("start", "Start"), ("ongoing", "Ongoing"),
                 ("finished", "Finished")],
        default="start",
    )

    class Meta:
        unique_together = ("tournament", "number")
        ordering = ["number"]

    def __str__(self):
        return f"Round {self.number} - {self.tournament.name}"


class Bracket(models.Model):
    STATUS_CHOICES = [
        ("start", "Start"),
        ("ongoing", "Ongoing"),
        ("finished", "Finished"),
    ]

    round = models.ForeignKey(
        Round, on_delete=models.CASCADE, related_name="brackets")
    participant1 = models.ForeignKey(
        Participant, on_delete=models.CASCADE, related_name="brackets_p1"
    )
    participant2 = models.ForeignKey(
        Participant, on_delete=models.CASCADE, related_name="brackets_p2"
    )
    score_p1 = models.PositiveIntegerField(default=0)
    score_p2 = models.PositiveIntegerField(default=0)
    winner = models.ForeignKey(
        Participant, on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="start")
    score = models.CharField(max_length=7, blank=True, null=True)

    def __str__(self):
        return f"{self.participant1.alias} vs {self.participant2.alias} - Round {self.round.number}"


class TournamentCreateSchema(Schema):
    tournament_name: str = Field(
        ..., min_length=1, max_length=settings.MAX_TOURNAMENT_NAME_LENGTH
    )
    required_participants: int = Field(...)

    @validator("required_participants")
    def check_participants(cls, v):
        options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if v not in options:
            raise ValueError(
                f"Number of participants must be one of: {options}")
        return v


class TournamentCreatedSchema(Schema):
    tournament_id: str
