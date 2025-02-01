from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from ninja import Field, Schema
from pydantic import model_validator

from .models import Profile

# ruff: noqa: S105


class Message(Schema):
    """
    Generic response from the server with user-friendly message.
    """

    msg: str


class UsernameSchema(Schema):
    """
    For payloads where certain action is performed on user.
    """

    username: str


class ValidationErrorMessageSchema(Message):
    type: str = Field(description="Type of the error. can be missing, validation_error or some kind of type error.")
    loc: list[str] = Field(
        description="Location of the error. It can be from path, from JSON payload or from anything else. Last item in "
        "the list is the name of failed field.",
    )


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user for preview in searches, friend lists etc.
    """

    username: str = Field(alias="user.username")
    nickname: str = Field(alias="user.nickname")
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
    elo_change_signed: int = Field(description="How much elo user gained or lost from this match.")
    elo_result: int = Field(description="Resulting elo after elo gain or loss from this match.")


class ProfileFullSchema(ProfileMinimalSchema):
    """
    Represents all the data for the full user's profile page.
    """

    date_joined: datetime = Field(alias="user.date_joined")
    wins: int
    loses: int
    total_matches: int
    winrate: int | None = Field(description="null if the player didn't play any games yet.")
    worst_enemy: OpponentProfileAndStatsSchema | None = Field(
        description="Player who won the most against current user.",
    )
    best_enemy: OpponentProfileAndStatsSchema | None = Field(
        description="Player who lost the most against current user.",
    )
    scored_balls: int = Field(description="How many balls player scored overall.")
    elo_history: list[EloDataPointSchema] = Field(
        description="List of data points for elo changes of the last 10 games.",
    )
    friends: list[ProfileMinimalSchema] = Field(description="List of first ten friends.", max_length=10)
    friends_count: int

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

    @staticmethod
    def resolve_friends_count(obj: Profile):
        return obj.friends.count()


class PasswordValidationSchema(Schema):
    password: str
    password_repeat: str

    def validate_password(self) -> list[dict]:
        err_dict = {}
        err_dict["password"] = []
        err_dict["password_repeat"] = []
        if self.password != self.password_repeat:
            err_dict["password_repeat"].append("Passwords do not match.")
        if len(self.password) < settings.AUTH_SETTINGS["password_min_len"]:
            err_dict["password"].append("Password should have at least 8 characters.")
        if settings.AUTH_SETTINGS["check_attribute_similarity"] and self.username and self.username in self.password:
            err_dict["password"].append("Password should not contain username.")
        return {k: v for k, v in err_dict.items() if v}


class SignUpSchema(PasswordValidationSchema):
    username: str
    email: str

    @model_validator(mode="after")
    def validate_new_user_data(self):
        err_dict = self.validate_password()

        if err_dict:
            raise ValidationError(err_dict)
        return self


class LoginSchema(Schema):
    username: str
    password: str


class UpdateUserChema(PasswordValidationSchema):
    username: str | None = None
    email: str | None = None
    nickname: str | None = None
    old_password: str | None = None
    password: str | None = None
    password_repeat: str | None = None

    @model_validator(mode="after")
    def validate_updated_user_data(self):
        err_dict = {}
        if self.password or self.password_repeat:
            err_dict = self.validate_password()

        if err_dict:
            raise ValidationError(err_dict)
        return self
