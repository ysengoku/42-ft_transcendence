from datetime import datetime
from uuid import UUID

from ninja import ModelSchema, Schema

from common.schemas import ProfileMinimalSchema
from tournaments.models import Bracket, Participant, Round, Tournament


class RoundSchema(ModelSchema):
    # tournament: "TournamentSchema"
    # tournament_id: UUID
    # number: int
    brackets: list["BracketSchema"]

    class Config:
        model = Round
        model_fields = ["number", "status"]

    # status: str


class ParticipantSchema(ModelSchema):
    # tournament_id: UUID
    user: ProfileMinimalSchema

    class Config:
        model = Participant
        model_fields = ["alias", "status", "current_round"]

    # alias: str
    # status:
    #     str
    # round: int


class BracketSchema(ModelSchema):
    game_id: UUID
    participant1: ParticipantSchema
    participant2: ParticipantSchema
    winner: ParticipantSchema | None

    class Config:
        model = Bracket
        model_fields = ["round", "status", "score_p1", "score_p2"]


class TournamentSchema(ModelSchema):
    creator: ProfileMinimalSchema
    participants: list["ParticipantSchema"]
    rounds: list["RoundSchema"]

    class Config:
        model = Tournament
        model_fields = ["id", "name", "status",
                        "date", "required_participants"]

    @staticmethod
    def resolve_creator(obj: Tournament) -> dict:
        return ProfileMinimalSchema.from_orm(obj.creator.profile.user).dict()

    @staticmethod
    def resolve_rounds(obj: Tournament) -> list:
        return [
            RoundSchema.from_orm(r).dict()
            for r in obj.rounds.all().prefetch_related("brackets")
        ]

    @staticmethod
    def resolve_participants(obj: Tournament) -> list:
        return [
            ParticipantSchema.from_orm(p).dict()
            for p in obj.participants.all().select_related("user")
        ]

    @staticmethod
    def resolve_winner(obj: Tournament):
        return obj.winner

        # TournamentSchema.update_forward_refs()
        # RoundSchema.update_forward_refs()
