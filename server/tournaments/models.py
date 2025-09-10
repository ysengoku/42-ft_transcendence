from __future__ import annotations

import logging
import uuid
from typing import Literal

from channels.db import database_sync_to_async
from django.conf import settings as django_settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Prefetch, Q
from django.utils import timezone

from pong.game_protocol import GameRoomSettings
from pong.models import GameRoom, get_default_game_room_settings
from users.models import Profile

logger = logging.getLogger("server")


class Participant(models.Model):
    PENDING = "pending"
    PLAYING = "playing"
    ELIMINATED = "eliminated"
    QUALIFIED = "qualified"
    WINNER = "winner"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (PLAYING, "Playing"),
        (ELIMINATED, "Eliminated"),
        (QUALIFIED, "Qualified"),
        (WINNER, "Winner"),
    ]

    profile = models.ForeignKey("users.Profile", on_delete=models.CASCADE)
    tournament = models.ForeignKey("Tournament", on_delete=models.CASCADE, related_name="participants")
    alias = models.CharField(max_length=255)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=PENDING)
    current_round = models.PositiveIntegerField(default=0)
    excluded = models.BooleanField(default=False)

    class Meta:
        unique_together = (("profile", "tournament"), ("tournament", "alias"))

    def __str__(self):
        return f"{self.alias} ({self.tournament.name})"

    async def async_set_eliminated(self):
        self.status = self.ELIMINATED
        await database_sync_to_async(self.save)()
        return self

    async def async_set_qualified(self):
        self.status = self.QUALIFIED
        await database_sync_to_async(self.save)()
        return self

    def set_qualified(self):
        self.status = self.QUALIFIED
        self.save()
        return self

    def set_eliminated(self):
        self.status = self.ELIMINATED
        self.save()
        return self


class TournamentQuerySet(models.QuerySet):
    def validate_and_create(
        self,
        creator: Profile,
        tournament_name: str,
        required_participants: int,
        alias: str,
        settings: GameRoomSettings | None = None,
    ):
        if not settings:
            settings = get_default_game_room_settings()

        if settings["ranked"]:
            settings["ranked"] = False
        if len(alias) > django_settings.MAX_ALIAS_LENGTH:
            raise ValidationError({"alias": [f"should not be longer than: {django_settings.MAX_ALIAS_LENGTH}"]})
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
    creator = models.ForeignKey("users.Profile", on_delete=models.CASCADE)
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
        ordering = ["-date"]

    def __str__(self):
        return f"{self.name} ({self.status})"

    def clean(self):
        num = self.required_participants
        options = [int(x) for x in django_settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if num not in options:
            raise ValidationError({"required_participants": [f"Number of participants must be one of: {options}"]})

    def get_rounds(self):
        return self.rounds.all().prefetch_related("brackets")

    def get_current_round_number(self):
        return self.rounds.filter(status=Round.FINISHED).count() + 1

    def get_current_round(self, round_number=None):
        if round_number is None:
            round_number = self.get_current_round_number()
        try:
            current_round = self.rounds.get(number=round_number)
        except Round.DoesNotExist:
            logger.warning("This round does not exist, recreating it for the tournament to continue")
            current_round = self.rounds.create(number=round_number)
        return current_round

    def get_user_current_bracket(self, profile: Profile, round_number):
        current_round = self.get_current_round(round_number)
        participant = current_round.tournament.participants.filter(profile=profile).first()
        if not participant:
            logger.warning("Profile is not a participant in this tournament")
            return None

        bracket = current_round.brackets.filter(
            models.Q(participant1=participant) | models.Q(participant2=participant),
        ).first()
        if not bracket:
            logger.warning("This user is not in any brackets of the current round")
            return None
        return bracket

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
        if len(alias) > django_settings.MAX_ALIAS_LENGTH:
            return "Alias is too big! It should not be longer than " + str(django_settings.MAX_ALIAS_LENGTH)
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
    def update_finished_bracket(
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
        bracket: Bracket = self.select_related(
            "participant1__profile",
             "participant2__profile").filter(id=bracket_id)
        bracket = bracket.first()
        if not bracket:
            return

        winner_participant: Participant = Participant.objects.filter(
            Q(brackets_p1__id=bracket_id) | Q(brackets_p2__id=bracket_id),
            profile__id=winner_profile_id,
        ).first()
        if not winner_participant:
            return

        participant1: Participant = bracket.participant1
        participant2: Participant = bracket.participant2
        if participant1 == winner_participant:
            participant2.set_eliminated()
        else:
            participant1.set_eliminated()
        winner_participant.set_qualified()
        bracket.winners_score = winners_score
        bracket.losers_score = losers_score
        bracket.winner = winner_participant
        bracket.status = status
        bracket.save()
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
    game_id = models.UUIDField(null=True, blank=True, editable=True)

    objects: BracketQuerySet = BracketQuerySet.as_manager()

    def __str__(self):
        return f"{self.participant1.alias} vs {self.participant2.alias} - Round {self.round.number}"

    def set_ongoing(self):
        self.status = self.ONGOING
        self.save()
        return self

    def get_winner(self):
        return self.winner
