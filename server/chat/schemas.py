from datetime import datetime

from ninja import Schema


# TODO: move common schemas to the common dir
class Message(Schema):
    """
    Generic response from the server with user-friendly message.
    """

    msg: str


class ChatMessageSchema(Schema):
    """
    Represents a singular message from the chat.
    """

    content: str
    date: datetime
    sender: str
    receiver: str
    is_read: bool
    is_liked: bool
    id: str


class BaseChatSchema(Schema):
    """
    Shared data that is present on all chat schemas.
    """

    username: str
    nickname: str
    avatar: str
    is_online: bool
    is_blocked_user: bool
    is_blocked_by_user: bool


class ChatPreviewSchema(BaseChatSchema):
    """
    Preview for a not opened yet chat.
    """

    unread_messages_count: int
    last_message: ChatMessageSchema


class ChatSchema(BaseChatSchema):
    """
    Already opened chat, with messages.
    """

    messages: list[ChatMessageSchema]
