from datetime import datetime
from uuid import UUID

from ninja import ModelSchema, Schema

from common.schemas import ProfileMinimalSchema
from tournaments.models import Tournament


class RoundSchema(Schema):
    tournament: "TournamentSchema"
    tournament_id: UUID
    number: int
    brackets: list["BracketSchema"]
    status: str


class ParticipantSchema(Schema):
    tournament_id: UUID
    user: ProfileMinimalSchema
    alias: str
    status: str
    round: int


class BracketSchema(Schema):
    game_id: UUID
    participant1: ParticipantSchema
    participant2: ParticipantSchema
    winner: ParticipantSchema | None
    round: int
    status: str
    score_p1: int
    score_p2: int


class TournamentSchema(ModelSchema):
    creator: ProfileMinimalSchema
    winner: ParticipantSchema | None
    rounds: list[RoundSchema]
    participants: list[ParticipantSchema]

    class Config:
        model = Tournament
        model_fields = ["id", "name", "status",
                        "date", "required_participants"]

    @staticmethod
    def resolve_creator(obj: Tournament):
        return obj.creator.profile.to_profile_minimal_schema()

    @staticmethod
    def resolve_rounds(obj: Tournament):
        return obj.rounds.all().prefetch_related("brackets")

    @staticmethod
    def resolve_participants(obj: Tournament):
        return obj.participants.all().select_related("user__profile")

    @staticmethod
    def resolve_winner(obj: Tournament):
        return obj.winner


TournamentSchema.update_forward_refs()
RoundSchema.update_forward_refs()
