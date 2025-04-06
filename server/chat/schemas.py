from datetime import datetime

from django.conf import settings
from ninja import Schema

from chat.models import Chat, ChatMessage, Notification
from users.schemas import UsernameNicknameAvatarSchema


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

    @staticmethod
    def resolve_avatar(obj):
        """Ensure avatar contains correct URL for both media and static images."""
        if obj.avatar == settings.DEFAULT_USER_AVATAR:
            return obj.avatar
        return f"{settings.MEDIA_URL}{obj.avatar}"


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


class BaseNotificationDataSchema(UsernameNicknameAvatarSchema):
    """
    Contains username, nickname and avatar of the sender, as well as current date.
    """

    date: datetime


class GameInviteNotificationDataSchema(BaseNotificationDataSchema):
    """
    When someone invited user to a game.
    """

    game_id: str


class NewTournamentNotificationDataSchema(BaseNotificationDataSchema):
    """
    When someone invited user to a tournament.
    """

    tournament_id: str
    tournament_name: str


class NewFriendNotificationDataSchema(BaseNotificationDataSchema):
    """
    When someone added user as a friend.
    """


class NotificationSchema(Schema):
    """
    Represents notification sent to a user.
    Can contain different types of `data` based on its `action`.
    """

    id: str
    action: str  # one of TYPE_CHOICES on the Notification model
    data: GameInviteNotificationDataSchema | NewTournamentNotificationDataSchema | NewFriendNotificationDataSchema
    is_read: bool

    @staticmethod
    def resolve_id(obj: Notification):
        return str(obj.id)
