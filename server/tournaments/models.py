# server/tournament/models.py
import uuid

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from ninja import Field, Router, Schema

from common.schemas import MessageSchema
from users.models import Profile


class Tournament(models.Model):
    STATUS_CHOICES = [
        ('lobby', 'Lobby'),
        ('ongoing', 'Ongoing'),
        ('finished', 'Finished'),
        ('canceled', 'Canceled')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    date = models.DateTimeField()
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='lobby')
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    winner = models.ForeignKey(
        'Participant', null=True, blank=True, on_delete=models.SET_NULL, related_name='won_tournaments'
    )
    required_participants = models.PositiveIntegerField()

    def clean(self):
        num = self.required_participants
        if num % 2 != 0 or not (4 <= num <= 16):
            raise ValidationError("Number of participants must be even.")
        if Tournament.objects.filter(name__iexact=self.name).exclude(pk=self.pk).exists():
            raise ValidationError(
                "A tournament with this name already exists.")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def participants(self):
        return self.participants.all()

    @property
    def rounds(self):
        return self.rounds.all()


class Participant(models.Model):
    STATUS_CHOICES = [
        ('registered', 'Registered'),
        ('playing', 'Playing'),
        ('eliminated', 'Eliminated'),
        ('winner', 'Winner'),
        ('unregistered', 'Unregistered')
    ]

    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="participants")
    alias = models.CharField(max_length=50)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default='registered')
    current_round = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (('user', 'tournament'), ('tournament', 'alias'))

    def __str__(self):
        return f"{self.alias} ({self.tournament.name})"


class Round(models.Model):
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='rounds')
    number = models.PositiveIntegerField()
    status = models.CharField(max_length=7, choices=[(
        'start', 'Start'), ('ongoing', 'Ongoing'), ('finished', 'Finished')], default='start')

    class Meta:
        unique_together = ('tournament', 'number')
        ordering = ['number']

    def __str__(self):
        return f"Round {self.number} - {self.tournament.name}"


class Bracket(models.Model):
    STATUS_CHOICES = [
        ('start', 'Start'),
        ('ongoing', 'Ongoing'),
        ('finished', 'Finished')
    ]

    round = models.ForeignKey(
        Round, on_delete=models.CASCADE, related_name='brackets')
    participant1 = models.ForeignKey(
        Participant, on_delete=models.CASCADE, related_name='brackets_p1')
    participant2 = models.ForeignKey(
        Participant, on_delete=models.CASCADE, related_name='brackets_p2')
    score_p1 = models.PositiveIntegerField(default=0)
    score_p2 = models.PositiveIntegerField(default=0)
    winner = models.ForeignKey(
        Participant, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(
        max_length=7, choices=STATUS_CHOICES, default='start')
    score = models.CharField(max_length=7, blank=True, null=True)

    def __str__(self):
        return f"{self.participant1.alias} vs {self.participant2.alias} - Round {self.round.number}"


class TournamentCreateSchema(Schema):
    tournament_name: str = Field(..., min_length=1, max_length=50)
    required_participants: int = Field(..., ge=4, le=16)

    @validator("required_participants")
    def must_be_even(cls, num):
       if num % 2 != 0:
            raise ValueError("Number of participants must be even.")
        return num


class TournamentCreatedSchema(Schema):
    tournament_id: str
