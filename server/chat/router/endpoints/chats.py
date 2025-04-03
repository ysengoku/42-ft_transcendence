import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from chat.models import Chat
from chat.schemas import ChatMessageSchema, ChatPreviewSchema, ChatSchema
from common.routers import get_profile_queryset_by_username_or_404
from common.schemas import MessageSchema

chats_router = Router()

logger = logging.getLogger("server")


@chats_router.get("", response={200: list[ChatPreviewSchema], frozenset({401}): MessageSchema})
@paginate
def get_chats(request: HttpRequest):
    """
    Gets chat previews.
    Paginated by the `limit` and `offset` settings.
    For example, `/chats?&limit=10&offset=0` will get 10 chats from the very first one.
    """
    profile = request.auth.profile
    return Chat.objects.get_user_chats(profile)


@chats_router.put("{username}", response={frozenset({200, 201}): ChatSchema, frozenset({401, 404}): MessageSchema})
def get_or_create_chat(request, username: str):
    """
    Gets a chat with specific user and first 30 messages.
    If the chat doesn't exist yet, creates it.
    """
    other_profile = get_profile_queryset_by_username_or_404(username).first()
    profile = request.auth.profile
    if other_profile == profile:
        raise HttpError(422, "Cannot get chat with yourself.")
    chat, created = Chat.objects.get_or_create(profile, other_profile)
    chat = Chat.objects.filter(
        pk=chat.pk).with_other_user_profile_info(profile).first()
    if created:
        channel_layer = get_channel_layer()
        for user_profile in [profile, other_profile]:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_profile.user.id}",
                {
                    "type": "join.chat",
                    "data": {"chat_id": str(chat.id)},
                },
            )
    return (201 if created else 200), chat


@chats_router.get("{username}/messages", response={200: list[ChatMessageSchema], frozenset({401, 404}): MessageSchema})
@paginate
def get_messages(request, username: str):
    """
    Gets messages of a specific chat.
    Paginated by the `limit` and `offset` settings.
    For example, `/ chats/celiastral/messages?& limit = 10 & offset = 0` will get 10 messages from the very first one.
    """
    other_profile = get_profile_queryset_by_username_or_404(username).first()
    profile = request.auth.profile
    if other_profile == profile:
        raise HttpError(422, "Cannot get messages with yourself.")
    chat = Chat.objects.for_exact_participants(profile, other_profile).first()
    if not chat:
        raise HttpError(404, f"Chat with {other_profile} was not found.")
    return chat.messages.all().prefetch_related("sender")
