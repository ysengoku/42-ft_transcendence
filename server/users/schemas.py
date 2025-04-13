from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from ninja import Field, Schema
from pydantic import model_validator

from chat.models import ChatMessage, Notification
from common.schemas import MessageSchema
from pong.models import Match
from pong.schemas import EloDataPointSchema

from .models import Profile, User

# ruff: noqa: S105


class UsernameSchema(Schema):
    """
    For payloads where certain action is performed on user.
    """

    username: str


class UsernameNicknameAvatarSchema(UsernameSchema):
    """
    For payloads where it's needed to know the most basic data about the user.
    """

    nickname: str
    avatar: str


class ValidationErrorMessageSchema(MessageSchema):
    type: str = Field(description="Type of the error. can be missing, validation_error or some kind of type error.")
    loc: list[str] = Field(
        description="Location of the error. It can be from path, from JSON payload or from anything else. Last item in "
        "the list is the name of failed field.",
    )


class LoginResponseSchema(Schema):
    mfa_required: bool
    username: str


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user for preview in searches, friend lists etc.
    """

    username: str = Field(alias="user.username")
    nickname: str = Field(alias="user.nickname")
    avatar: str
    elo: int
    is_online: bool


class SelfSchema(ProfileMinimalSchema):
    """
    Like ProfileMinimalSchema, but contains private information like the count of unread notifications and messages.
    """

    unread_messages_count: int
    unread_notifications_count: int

    @staticmethod
    def resolve_unread_messages_count(obj: Profile):
        return ChatMessage.objects.count_unread(obj)

    @staticmethod
    def resolve_unread_notifications_count(obj: Profile):
        return Notification.objects.count_unread(obj)


class UserSettingsSchema(Schema):
    username: str
    nickname: str
    email: str | None
    connection_type: str
    mfa_enabled: bool
    avatar: str = Field(alias="profile.avatar")

    @staticmethod
    def resolve_connection_type(obj: User):
        oauth_connection = obj.get_oauth_connection()
        return oauth_connection.connection_type if oauth_connection else "regular"


class OAuthCallbackParams(Schema):
    code: str | None = None
    state: str | None = None
    error: str | None = None
    error_description: str | None = None


class OpponentProfileAndStatsSchema(Schema):
    """
    Stats of the current user against some other player and the minimal representation of the player.
    Wins, loses and winrate are against this specific player.
    """

    username: str
    nickname: str
    avatar: str
    elo: int
    wins: int
    loses: int
    winrate: int


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
        description="List of data points for elo changes of the last 7 days.",
    )
    friends: list[ProfileMinimalSchema] = Field(description="List of first ten friends.", max_length=10)
    friends_count: int
    is_friend: bool
    is_blocked_user: bool
    is_blocked_by_user: bool

    @staticmethod
    def resolve_worst_enemy(obj: Profile):
        worst_enemy: Profile = obj.get_worst_enemy()
        if not worst_enemy:
            return None
        return obj.get_stats_against_player(worst_enemy)

    @staticmethod
    def resolve_best_enemy(obj: Profile):
        best_enemy: Profile = obj.get_best_enemy()
        if not best_enemy:
            return None
        return obj.get_stats_against_player(best_enemy)

    @staticmethod
    def resolve_scored_balls(obj: Profile):
        return obj.get_scored_balls()

    @staticmethod
    def resolve_elo_history(obj: Profile):
        return Match.objects.get_elo_points_by_day(obj)[:7]

    @staticmethod
    def resolve_friends(obj: Profile):
        return obj.friends.all()[:10]

    @staticmethod
    def resolve_friends_count(obj: Profile):
        return obj.friends.count()


class PasswordValidationSchema(Schema):
    password: str
    password_repeat: str
    username: str | None = None

    def validate_password(self) -> dict[str, list[str]]:
        err_dict = {}
        err_dict["password"] = []
        err_dict["password_repeat"] = []

        if self.password != self.password_repeat:
            err_dict["password_repeat"].append("Passwords do not match.")

        if len(self.password) < settings.AUTH_SETTINGS.get("password_min_len"):
            err_dict["password"].append("Password should have at least 8 characters.")

        if (
            settings.AUTH_SETTINGS.get("check_attribute_similarity")
            and self.username
            and self.username in self.password
        ):
            err_dict["password"].append("Password should not contain username.")

        if settings.AUTH_SETTINGS.get("check_is_alphanumeric") and (
            not any(c.isalpha() for c in self.password) or not any(c.isnumeric() for c in self.password)
        ):
            err_dict["password"].append("Password should have at least 1 letter and 1 digit.")

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
    mfa_enabled: bool | None = None

    @model_validator(mode="after")
    def validate_updated_user_data(self):
        err_dict = {}
        if self.password or self.password_repeat:
            err_dict = self.validate_password()

        if err_dict:
            raise ValidationError(err_dict)
        return self


class ForgotPasswordSchema(Schema):
    email: str


class SendMfaCode(Schema):
    token: str
