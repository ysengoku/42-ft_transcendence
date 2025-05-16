from datetime import datetime
from uuid import UUID

from django.db.models import Prefetch
from ninja import Field, ModelSchema, Schema

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

    @staticmethod
    def resolve_brackets(obj: Round):
        return [BracketSchema.from_orm(b) for b in obj.brackets.all()]
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
    creator: ProfileMinimalSchema = Field(..., alias="creator.profile")
    tournament_id: UUID = Field(..., alias="id")
    tournament_name: str = Field(..., alias="name")
    rounds: list[RoundSchema] = Field(default_factory=list)
    participants: list[ParticipantSchema] = Field(default_factory=list)
    # rounds: list["RoundSchema"]
    # participants: list["ParticipantSchema"]

    class Config:
        model = Tournament
        # model_fields = ["id", "name", "status",
        #                 "date", "required_participants"]
        model_fields = [
            "id",
            "name",
            "status",
            "date",
            "required_participants",
            "creator"
        ]

    @staticmethod
    def resolve_creator(obj: Tournament):
        return ProfileMinimalSchema.from_orm(obj.creator.profile)

    @staticmethod
    def resolve_rounds(obj: Tournament):
        return [RoundSchema.from_orm(r) for r in obj.tournament_rounds.all()]

    @staticmethod
    def resolve_participants(obj: Tournament):
        return [ParticipantSchema.from_orm(p) for p in obj.tournament_participants.all()]

    # class Config:
    #     model = Tournament
    #     model_fields = ["id", "name", "status",
    #                     "date", "required_participants"]
    #     model_fields_rename = {
    #         "id": "tournament_id",
    #         "name": "tournament_name"
    #     }
    #
    # @staticmethod
    # def resolve_creator(obj: Tournament) -> dict:
    #     return ProfileMinimalSchema.from_orm(obj.creator.profile.user).dict()
    #
    # @staticmethod
    # def resolve_rounds(obj: Tournament):
    #     return [
    #         RoundSchema.from_orm(r).dict()
    #         for r in obj.tournament_rounds.all()
    #     ]
    #
    # @staticmethod
    # def resolve_participants(obj: Tournament):
    #     return [
    #         ParticipantSchema.from_orm(p)
    #         for p in obj.tournament_participants.all()
    #     ]
