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
from chat.models import Chat, ChatMessage, Notification
from chat.routing import websocket_urlpatterns
from users.models import Profile

logger = logging.getLogger("server")
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("server").setLevel(logging.WARNING)
application = ProtocolTypeRouter({
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    )
})


class UserEventsConsumerTests(TransactionTestCase):
    async def get_authenticated_communicator(self):
        self.user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="testuser",
            password="testpass"
        )
        self.profile = await database_sync_to_async(Profile.objects.get)(user=self.user)
        self.chat = await database_sync_to_async(Chat.objects.create)()
        await database_sync_to_async(self.chat.participants.add)(self.user.profile)
        await database_sync_to_async(lambda: list(self.chat.participants.all()))()
        await database_sync_to_async(lambda: list(Chat.objects.all()))()
        # Token JWT
        access_token = AccessToken.for_user(self.user)

        # Connexion WebSocket
        communicator = WebsocketCommunicator(
            application,  # Use application ASGI configured for test
            f"/ws/events/?token={access_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected, "Connexion to the WebSocket failed")
        return communicator

    async def test_unauthenticated_connection_rejected(self):
        # Connexion attemps without token
        communicator = WebsocketCommunicator(
            UserEventsConsumer.as_asgi(),
            "/ws/events/"
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)

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

    async def test_uuid_validation(self):
        communicator = await self.get_authenticated_communicator()

        invalid_data = {
            "action": "new_message",
            "data": {
                "content": "Test UUID validation",
                "chat_id": "invalid-uuid-format"
            }
        }

        await communicator.send_json_to(invalid_data)

        with self.assertLogs('server', level='WARNING') as logs:
            await communicator.receive_nothing()
            self.assertTrue(
                any("Invalid UUID format" in log for log in logs.output))

    async def test_missing_chat_id_field(self):
        communicator = await self.get_authenticated_communicator()

        invalid_data = {
            "action": "new_message",
            "data": {"content": "Message incomplet"}
        }

        await communicator.send_json_to(invalid_data)

        with self.assertLogs('server', level='WARNING') as logs:
            await communicator.receive_nothing()
            self.assertTrue(any("Missing field" in log for log in logs.output))

    async def test_missing_content_field(self):
        communicator = await self.get_authenticated_communicator()

        invalid_data = {
            "action": "new_message",
            "data": {"content": "Message incomplet"}
        }

        await communicator.send_json_to(invalid_data)

        with self.assertLogs('server', level='WARNING') as logs:
            await communicator.receive_nothing()
            self.assertTrue(any("Missing field" in log for log in logs.output))

    async def test_like_own_message_prevention(self):
        communicator = await self.get_authenticated_communicator()

        # Création message
        message = await database_sync_to_async(ChatMessage.objects.create)(
            sender=self.profile,
            content="Test like",
            chat=self.chat
        )

        like_data = {
            "action": "like_message",
            "data": {
                "id": str(message.id),
                "chat_id": str(self.chat.id)
            }
        }

        await communicator.send_json_to(like_data)
        self.assertFalse(message.is_liked)

    async def test_valid_message_workflow(self):
        communicator = await self.get_authenticated_communicator()

        # first notification is user_online
        user_status = await communicator.receive_json_from()
        self.assertEqual(user_status["action"], "user_online")

        valid_data = {
            "action": "new_message",
            "data": {
                "content": "Message valide",
                "chat_id": str(self.chat.id)
            }
        }

        await communicator.send_json_to(valid_data)

        response = await communicator.receive_json_from()
        self.assertEqual(response["action"], "new_message")
        msg_count = await database_sync_to_async(ChatMessage.objects.count)()
        self.assertEqual(msg_count, 1)

        self.assertEqual(response["action"], "new_message")

    async def test_notification_workflow(self):
        communicator = await self.get_authenticated_communicator()

        # first notification is user_online
        user_status = await communicator.receive_json_from()
        self.assertEqual(user_status["action"], "user_online")
        notification_data = {
            "action": "notification",
            "data": {
                "message": "Test notification",
                "type": "info"
            }
        }

        await communicator.send_json_to(notification_data)

        # Attendre la réponse du consumer
        response = await communicator.receive_json_from()
        self.assertEqual(response["action"], "notification")

        # Vérification base
        notif_count = await database_sync_to_async(Notification.objects.count)()
        self.assertEqual(notif_count, 1)
        # Vérification création notification
        notif_count = await database_sync_to_async(Notification.objects.count)()
        self.assertEqual(notif_count, 1)
