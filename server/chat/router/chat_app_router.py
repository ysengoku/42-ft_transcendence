from ninja import Router

from .endpoints.chats import chats_router
from .endpoints.notifications import notifications_router

chat_app_router = Router()

chat_app_router.add_router("chats", chats_router)
chat_app_router.add_router("notifications", notifications_router)
