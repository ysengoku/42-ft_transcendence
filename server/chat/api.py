from ninja import NinjaAPI
from ninja.pagination import paginate

from .models import Chat, ChatMessage
from .schemas import ChatMessageSchema, ChatPreviewSchema, ChatSchema, MessageSchema

# TODO: move all api's to the same place
api = NinjaAPI()


@api.get("", response={200: list[ChatPreviewSchema], frozenset({401}): ChatMessageSchema})
@paginate
def get_chats():
    """
    Gets chat previews.
    Paginated by the `limit` and `offset` settings.
    For example, `/chats?&limit=10&offset=0` will get 10 chats from the very first one.
    """


@api.get("{username}", response={200: ChatSchema, frozenset({401}): ChatMessageSchema})
@paginate
def get_chat(username: str):
    """
    Gets a specific chat with first 30 messages.
    """


@api.get("{username}/messages", response={200: list[ChatMessageSchema], frozenset({401}): MessageSchema})
@paginate
def get_messages(username: str):
    """
    Gets messages of a specific chat.
    Paginated by the `limit` and `offset` settings.
    For example, `/chats/celiastral/messages?&limit=10&offset=0` will get 10 messages from the very first one.
    """
