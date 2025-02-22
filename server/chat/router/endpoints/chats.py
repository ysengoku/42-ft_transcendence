from django.http import HttpRequest
from ninja import Router
from ninja.pagination import paginate

from chat.models import Chat
from chat.schemas import ChatMessageSchema, ChatPreviewSchema, ChatSchema, MessageSchema

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


@chats_router.get("{username}", response={200: ChatSchema, frozenset({401}): ChatMessageSchema})
def get_chat(username: str):
    """
    Gets a specific chat with first 30 messages.
    """


@chats_router.get("{username}/messages", response={200: list[ChatMessageSchema], frozenset({401}): MessageSchema})
@paginate
def get_messages(username: str):
    """
    Gets messages of a specific chat.
    Paginated by the `limit` and `offset` settings.
    For example, `/chats/celiastral/messages?&limit=10&offset=0` will get 10 messages from the very first one.
    """
