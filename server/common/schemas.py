from typing import Literal

from ninja import Field, Schema


class MessageSchema(Schema):
    """
    Generic response from the server with user-friendly message.
    """

    msg: str


class ProfileMinimalSchema(Schema):
    """
    Represents the bare minimum information about the user for preview in searches, friend lists etc.
    """

    username: str = Field(alias="user.username")
    nickname: str = Field(alias="user.nickname")
    avatar: str
    elo: int
    is_online: bool


class ValidationErrorMessageSchema(MessageSchema):
    type: str = Field(description="Type of the error. can be missing, validation_error or some kind of type error.")
    loc: list[str] = Field(
        description="Location of the error. It can be from path, from JSON payload or from anything else. Last item in "
        "the list is the name of failed field.",
    )


class GameSettingsSchema(Schema):
    game_speed: Literal["slow", "medium", "fast"] = Field(default="medium")
    score_to_win: int = Field(default=5, ge=3, le=20)
    time_limit: int = Field(default=3, ge=1, le=5)
    ranked: bool = Field(default=False)
    cool_mode: bool = Field(default=False)
