from datetime import datetime
from uuid import UUID

from ninja import Schema


class RoundSchema(Schema):
    tournament: 'TournamentSchema'
    tournament_id: UUID
    number: int
    brackets: list['BracketSchema']
    status: str


class ParticipantSchema(Schema):
    tournament_id: UUID
    user: str
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


class TournamentSchema(Schema):
    id: UUID
    name: str
    status: str
    creator: str
    winner: str
    date: datetime
    rounds: list[RoundSchema]
    participants: list[ParticipantSchema]
    required_participants: int


TournamentSchema.update_forward_refs()
RoundSchema.update_forward_refs()
