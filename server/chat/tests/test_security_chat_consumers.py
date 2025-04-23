# tests/test_consumers.py


import logging

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken

from chat.consumers import UserEventsConsumer
from chat.middleware import JWTAuthMiddleware
from chat.models import Chat
from chat.routing import websocket_urlpatterns
from users.models import Profile

logger = logging.getLogger("server")
application = ProtocolTypeRouter({
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    )
})


class UserEventsConsumerTests(TransactionTestCase):
    async def get_authenticated_communicator(self):
        # Création utilisateur
        self.user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="testuser",
            password="testpass"
        )
        logger.info("USER EVENT TESTS")
        self.profile = await database_sync_to_async(Profile.objects.get)(user=self.user)
        logger.info("USER TEST : %s", self.user.username)
        logger.info("USER PROFILE : %s", self.user.profile)
        # Création chat
        self.chat = await database_sync_to_async(Chat.objects.create)()
        await database_sync_to_async(self.chat.participants.add)(self.user.profile)

        # Token JWT
        access_token = AccessToken.for_user(self.user)

        # Connexion WebSocket
        communicator = WebsocketCommunicator(
            application,  # Utilisez l'application ASGI configurée
            f"/ws/events/?token={access_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected, "Échec de la connexion WebSocket")
        return communicator

    async def test_invalid_message_length(self):
        communicator = await self.get_authenticated_communicator()

        # Message de 257 caractères
        invalid_data = {
            "action": "new_message",
            "data": {
                "content": "A" * 257,
                "chat_id": str(self.chat.id)
            }
        }
        await communicator.send_json_to(invalid_data)

        # Vérification des logs
        with self.assertLogs('server', level='WARNING') as logs:
            await communicator.receive_nothing()
            self.assertTrue(
                any("Message too long" in log for log in logs.output))

        await communicator.disconnect()
