from django.db.models import Sum, Count
from ninja import Schema, Field
from datetime import datetime
from .models import Profile
from typing import List


class ErrorSchema(Schema):
    message: str


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user.
    """
    username: str = Field(alias="user.username")
    avatar: str
    elo: int


class EloDataPointSchema(Schema):
    """
    Represents a single point on the graph of the user's elo history.
    """
    date: datetime
    elo_change_signed: int
    elo_result: int


class ProfileFullSchema(ProfileMinimalSchema):
    """
    Represents all the data for the user profile page.
    """
    date_joined: datetime = Field(alias="user.date_joined")
    wins: int
    loses: int
    winrate: int
    worst_enemy: ProfileMinimalSchema | None = None
    best_enemy: ProfileMinimalSchema | None = None
    scored_balls: int
    elo_history: List[EloDataPointSchema] = Field(alias="get_elo_data_points")
    is_online: bool
    friends: List[ProfileMinimalSchema]


class SignUpSchema(Schema):
    username: str
    email: str
    password: str
    password_repeat: str
