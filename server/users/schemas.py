from ninja import Schema, Field
from ninja.errors import ValidationError as NinjaValidationError
from datetime import datetime
from typing import List, Optional, Dict
from .models import Profile
from django.core.exceptions import ValidationError
from pydantic import model_validator
from django.conf import settings


class Message(Schema):
    msg: str


class ValidationErrorMessageSchema(Message):
    type: str = Field(
        description="Type of the error. can be missing, validation_error or some kind of type error."
    )
    loc: List[str] = Field(
        description="Location of the error. It can be from path, from JSON payload or from anything else. Last item in the list is the name of failed field."
    )


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user for preview in searches, friend lists etc.
    """

    username: str = Field(alias="user.username")
    avatar: str
    elo: int
    is_online: bool


class OpponentProfileAndStatsSchema(Schema):
    """
    Stats of the current user against some other player and the minimal representation of the player.
    Wins, loses and winrate are against this specific player.
    """

    username: str
    avatar: str
    elo: int
    wins: int
    loses: int
    winrate: int


class EloDataPointSchema(Schema):
    """
    Represents a single point on the graph of the user's elo history.
    """

    date: datetime
    elo_change_signed: int = Field(
        description="How much elo user gained or lost from this match."
    )
    elo_result: int = Field(
        description="Resulting elo after elo gain or loss from this match."
    )


class ProfileFullSchema(ProfileMinimalSchema):
    """
    Represents all the data for the full user's profile page.
    """

    date_joined: datetime = Field(alias="user.date_joined")
    wins: int
    loses: int
    total_matches: int
    winrate: int | None = Field(
        description="null if the player didn't play any games yet."
    )
    worst_enemy: OpponentProfileAndStatsSchema | None = Field(
        description="Player who won the most against current user."
    )
    best_enemy: OpponentProfileAndStatsSchema | None = Field(
        description="Player who lost the most against current user."
    )
    scored_balls: int = Field(description="How many balls player scored overall.")
    elo_history: List[EloDataPointSchema] = Field(
        description="List of data points for elo changes of the last 10 games."
    )
    friends: List[ProfileMinimalSchema] = Field(
        description="List of first ten friends.", max_length=10
    )

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
        return obj.annotate_elo_data_points()[:10]

    @staticmethod
    def resolve_friends(obj: Profile):
        return obj.friends.all()[:10]


class PasswordValidationSchema(Schema):
    password: str
    password_repeat: str

    def validate_password(self) -> List[Dict]:
        err_list = []
        if self.password != self.password_repeat:
            err_list.append({"msg": "Passwords do not match."})
        if len(self.password) < settings.AUTH_SETTINGS["password_min_len"]:
            err_list.append({"msg": "Password should have at least 8 characters."})
        if settings.AUTH_SETTINGS["check_attribute_similarity"] and self.username and self.username in self.password:
            err_list.append({"msg": "Password should not contain username."})

        return err_list


class SignUpSchema(PasswordValidationSchema):
    username: str
    email: str

    @model_validator(mode="after")
    def validate_new_user_data(self):
        err_list = self.validate_password()

        if err_list:
            raise ValidationError({"msg": err_list})
        return self


class UpdateUserChema(Schema):
    username: Optional[str] = None
    email: Optional[str] = None
    old_password: Optional[str] = None
    password: Optional[str] = None
    password_repeat: Optional[str] = None

    @model_validator(mode="after")
    def validate_updated_user_data(self):
        if self.password and self.password_repeat:
            err_list = self.validate_password()

        if err_list:
            raise ValidationError({"msg": err_list})
        return self
