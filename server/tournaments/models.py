# server/tournament/models.py
import uuid

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from users.models import Profile


class Tournament(models.Model):
    STATUS_CHOICES = [
        ('lobby', 'En attente'),
        ('ongoing', 'En cours'),
        ('finished', 'Terminé'),
        ('canceled', 'Annulé')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    participants = models.ManyToManyField(Profile, related_name='tournaments')
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='lobby')
    max_participants = models.IntegerField()
    rounds = models.JSONField(encoder=DjangoJSONEncoder, default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']
