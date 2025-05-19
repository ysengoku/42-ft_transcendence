from uuid import UUID

from django.conf import settings
from django.core.exceptions import ValidationError
from ninja import Field, Schema
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
    creator: ProfileMinimalSchema = Field(alias="creator.profile")
    tournament_id: UUID = Field(alias="id")
    tournament_name: str = Field(alias="name")
    rounds: list[RoundSchema] = Field(default_factory=list)
    participants: list[ParticipantSchema] = Field(default_factory=list)


class TournamentCreateSchema(Schema):
    tournament_name: str = Field(min_length=1, max_length=settings.MAX_TOURNAMENT_NAME_LENGTH)
    required_participants: int

    @model_validator(mode="after")
    def check_participants(self):
        options = [int(x) for x in settings.REQUIRED_PARTICIPANTS_OPTIONS]
        if self.required_participants not in options:
            raise ValidationError(
                f"Number of participants must be one of: {', '.join(settings.REQUIRED_PARTICIPANTS_OPTIONS)}",
            )
        return self
