from ninja import Schema, Field
from datetime import datetime
from typing import List
from typing_extensions import TypedDict
from .models import Profile


class ErrorSchema(Schema):
    message: str


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user for preview in searches, friend lists etc.
    """
    username: str = Field(alias="user.username")
    avatar: str
    elo: int
    is_online: bool


class OpponentProfileAndStatsSchema(TypedDict):
    """
    Stats of the current user against some other player and the minimal representation of the player.
    Wins, loses and winrate are against this specific player.
    """
    username: str
    avatar: str
    elo: int
    wins: int
    loses: int
    winrate: int | None


class EloDataPointSchema(Schema):
    """
    Represents a single point on the graph of the user's elo history.
    """
    date: datetime
    elo_change_signed: int = Field(description="How much elo user gained or lost from this match.")
    elo_result: int = Field(description="Resulting elo after elo gain or loss from this match.")


class ProfileFullSchema(ProfileMinimalSchema):
    """
    Represents all the data for the full user's profile page.
    """
    date_joined: datetime
    wins: int
    loses: int
    winrate: int | None = Field(description="null if the player didn't play any games yet.")
    worst_enemy: OpponentProfileAndStatsSchema | None = Field(description="Player who won the most against current user.")
    best_enemy: OpponentProfileAndStatsSchema | None = Field(description="Player who lost the most against current user.")
    scored_balls: int = Field(description="How many balls player scored overall.")
    elo_history: List[EloDataPointSchema] = Field(description="List of data points for elo changes of the last 10 games.")
    friends: List[ProfileMinimalSchema]

    @staticmethod
    def resolve_worst_enemy(obj: Profile):
        worst_enemy: Profile = obj.worst_enemy
        if not worst_enemy:
            return None
        return obj.get_stats_against_player(worst_enemy)

    @staticmethod
    def resolve_best_enemy(obj: Profile):
        best_enemy: Profile = obj.best_enemy
        if not best_enemy:
            return None
        return obj.get_stats_against_player(best_enemy)

    @staticmethod
    def resolve_elo_history(obj: Profile):
        return obj.get_elo_data_points()[:10]


class SignUpSchema(Schema):
    username: str
    email: str
    password: str
    password_repeat: str
