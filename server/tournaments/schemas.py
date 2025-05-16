from datetime import datetime
from uuid import UUID

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
    rounds: list["RoundSchema"]
    participants: list["ParticipantSchema"]

    class Config:
        model = Tournament
        model_fields = ["id", "name", "status",
                        "date", "required_participants"]

    @staticmethod
    def resolve_creator(obj: Tournament):
        return ProfileMinimalSchema.from_orm(obj.creator.profile)

    @staticmethod
    def resolve_rounds(obj: Tournament):
        return [
            RoundSchema.from_orm(r).dict()
            for r in obj.tournament_rounds.all()
        ]

    @staticmethod
    def resolve_participants(obj: Tournament):
        return [
            ParticipantSchema.from_orm(p)
            for p in obj.tournament_participants.all()
        ]


# class TournamentSchema(Schema):
#     creator: ProfileMinimalSchema
#     tournament_id: UUID
#     tournament_name: str
#     required_participants: int
#     status: str
#     participants: list["ParticipantSchema"]
#     rounds: list["RoundSchema"]
#
#     # class Config:
#     #     model = Tournament
#     #     model_fields = ["id", "name", "status",
#     #                     "date", "required_participants"]
#
#     @staticmethod
#     def resolve_creator(obj: Tournament) -> dict:
#         return {
#             "user.username": obj.creator.username,
#             "user.nickname": obj.creator.nickname,
#             "avatar": obj.creator.profile.avatar.url if obj.creator.profile.avatar else settings.DEFAULT_USER_AVATAR,
#             "elo": obj.creator.profile.elo,
#             "is_online": obj.creator.profile.is_online,
#         }
#
#     @staticmethod
#     def resolve_rounds(obj: Tournament) -> list:
#         return [
#             RoundSchema.from_orm(r).dict()
#             for r in obj.rounds.all().prefetch_related("brackets")
#         ]
#
#     @staticmethod
#     def resolve_participants(obj: Tournament) -> list:
#         return [
#             ParticipantSchema.from_orm(p).dict()
#             for p in obj.participants.all().select_related("user")
#         ]
#
#     @staticmethod
#     def resolve_winner(obj: Tournament):
#         return obj.winner
#
        # TournamentSchema.update_forward_refs()
        # RoundSchema.update_forward_refs()
