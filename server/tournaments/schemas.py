from uuid import UUID

from django.conf import settings
from django.core.exceptions import ValidationError
from ninja import Schema
from pydantic import model_validator

from common.schemas import ProfileMinimalSchema


class ParticipantSchema(Schema):
    profile: ProfileMinimalSchema
    alias: str


class BracketSchema(Schema):
    game_id: UUID | None = None
    participant1: ParticipantSchema
    participant2: ParticipantSchema
    winner: ParticipantSchema | None = None


class RoundSchema(Schema):
    number: int
    brackets: list[BracketSchema]


class TournamentSchema(Schema):
    creator: ProfileMinimalSchema
    id: UUID
    name: str
    rounds: list[RoundSchema]
    participants: list[ParticipantSchema]


class TournamentCreateSchema(Schema):
    name: str
    required_participants: int

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
