from datetime import datetime

from ninja import Schema

from chat.models import Chat, ChatMessage


class ChatMessageSchema(Schema):
    """
    Represents a singular message from the chat.
    """

    content: str
    date: datetime
    sender: str
    is_read: bool
    is_liked: bool
    id: str

    @staticmethod
    def resolve_sender(obj: ChatMessage):
        return obj.sender.user.username

    @staticmethod
    def resolve_id(obj: ChatMessage):
        return str(obj.pk)


class BaseChatSchema(Schema):
    """
    Shared data that is present on all chat schemas.
    """

    chat_id: str
    username: str
    nickname: str
    avatar: str
    is_online: bool
    is_blocked_user: bool
    is_blocked_by_user: bool

    @staticmethod
    def resolve_chat_id(obj: Chat):
        return str(obj.id)


class ChatPreviewSchema(BaseChatSchema):
    """
    Preview for a not opened yet chat.
    """

    unread_messages_count: int
    last_message: ChatMessageSchema | None = None

    @staticmethod
    def resolve_last_message(obj: Chat):
        return ChatMessage.objects.filter(pk=obj.last_message_id).first()


class ChatSchema(BaseChatSchema):
    """
    Already opened chat, with the last 30 messages.
    """

    messages: list[ChatMessageSchema]

    @staticmethod
    def resolve_messages(obj: Chat):
        return obj.messages.all().prefetch_related("sender")[:30]
