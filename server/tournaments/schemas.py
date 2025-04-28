from datetime import datetime
from typing import List, Optional
from uuid import UUID

from django.conf import settings
from ninja import Schema

from tournaments.models import Bracket, Participant, Round, Tournament


class TournamentSchema(Schema):
    id: UUID
    name: str
    status: str
    creator: str
    winner: str
    date: datetime
    rounds: List[RoundSchema]
    participants: List[ParticipantSchema]
    required_participants: int


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
    winner: Optional[ParticipantSchema]
    round: int
    status: str
    score_p1: int
    score_p2: int


class RoundSchema(Schema):
    tournament: TournamentSchema
    tournament_id: UUID
    number: int
    brackets: List[BracketSchema]
    status: str
