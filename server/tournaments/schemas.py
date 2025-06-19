from datetime import datetime
from typing import Literal
from uuid import UUID

from django.conf import settings
from django.core.exceptions import ValidationError
from ninja import Schema
from pydantic import model_validator

from common.schemas import GameSettingsSchema, ProfileMinimalSchema
from tournaments.models import Participant, Tournament


class ParticipantSchema(Schema):
    profile: ProfileMinimalSchema
    alias: str
    status: Literal["pending", "playing", "qualified", "eliminated", "winner"]


class BracketSchema(Schema):
    game_id: UUID | None = None
    participant1: ParticipantSchema
    participant2: ParticipantSchema
    winner: ParticipantSchema | None = None
    status: Literal["pending", "ongoing", "finished", "cancelled"]
    score_p1: int
    score_p2: int


class RoundSchema(Schema):
    number: int
    brackets: list[BracketSchema]
    status: Literal["pending", "ongoing", "finished"]


class TournamentSchema(Schema):
    """Schema that represents a singular Tournament."""

    tournament_creator: ParticipantSchema | None
    id: UUID
    name: str
    rounds: list[RoundSchema]
    participants: list[ParticipantSchema]
    status: str
    required_participants: int
    date: datetime
    participants_count: int | None
    settings: GameSettingsSchema
    winner: ParticipantSchema | None

    @staticmethod
    def resolve_participants_count(obj: Tournament):
        return Tournament.objects.get(id=obj.id).participants.count() or None

    @staticmethod
    def resolve_tournament_creator(obj: Tournament):
        return Participant.objects.filter(profile=obj.creator, tournament=obj).first()


class TournamentCreateSchema(Schema):
    """Schema that represents the necessary data to create a Tournament."""

    name: str
    required_participants: Literal[4, 8]
    alias: str
    settings: GameSettingsSchema

    @model_validator(mode="after")
    def validate_tournament_schema(self):
        if len(self.name) < 1:
            raise ValidationError({"name": ["Tournament name should have at least 1 character."]})

        if len(self.name) > settings.MAX_TOURNAMENT_NAME_LENGTH:
            raise ValidationError(
                {
                    "name": [
                        f"Tournament name should not exceed {settings.MAX_TOURNAMENT_NAME_LENGTH} characters.",
                    ],
                },
            )

        options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if self.required_participants not in options:
            raise ValidationError(
                {
                    "required_participants": [
                        f"Number of participants must be one of: {', '.join(settings.REQUIRED_PARTICIPANTS_OPTIONS)}",
                    ],
                },
            )
        return self
