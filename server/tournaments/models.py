# server/tournament/models.py
import uuid

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

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
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='lobby')
    created_at = models.DateTimeField(auto_now_add=True)
    required_participants = models.PositiveIntegerField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"


class Participant(models.Model):
    STATUS_CHOICES = [
        ('registered', 'Registered'),
        ('playing', 'Playing'),
        ('eliminated', 'Eliminated'),
        ('winner', 'Winner'),
        ('unregistered', 'Unregistered')
    ]

    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    alias = models.CharField(max_length=50)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default='registered')
    current_round = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('user', 'tournament')

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
    winner = models.ForeignKey(
        Participant, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(
        max_length=7, choices=STATUS_CHOICES, default='start')
    score = models.CharField(max_length=7, blank=True, null=True)

    def __str__(self):
        return f"{self.participant1.alias} vs {self.participant2.alias} - Round {self.round.number}"
