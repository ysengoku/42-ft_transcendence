from django.http import HttpRequest
from ninja import Router
from ninja.pagination import paginate

from chat.models import Chat
from chat.schemas import ChatMessageSchema, ChatPreviewSchema, ChatSchema, MessageSchema
from common.routers import get_profile_queryset_by_username_or_404

chats_router = Router()


@chats_router.get("", response={200: list[ChatPreviewSchema], frozenset({401}): ChatMessageSchema})
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
    chat, created = Chat.objects.get_or_create(profile, other_profile)
    chat = (
        Chat.objects.filter(pk=chat.pk).with_other_user_profile_info(other_profile).first()
    )
    if created:
        return 201, chat
    return 200, chat


@chats_router.get("{username}/messages", response={200: list[ChatMessageSchema], frozenset({401, 404}): MessageSchema})
@paginate
def get_messages(username: str):
    """
    Gets messages of a specific chat.
    Paginated by the `limit` and `offset` settings.
    For example, `/chats/celiastral/messages?&limit=10&offset=0` will get 10 messages from the very first one.
    """
