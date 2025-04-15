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
