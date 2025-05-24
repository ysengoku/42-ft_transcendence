# tests/test_consumers.py

import logging
from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase

from chat.consumers import UserEventsConsumer
from chat.models import Chat, ChatMessage, Notification
from chat.routing import websocket_urlpatterns
from users.middleware import JWTWebsocketAuthMiddleware
from users.models import Profile, RefreshToken, User


class JWTAuthMiddleware:

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token_params = parse_qs(query_string).get('token', [])
        token = token_params[0] if token_params else None

        if token:
            user = await self.get_user_from_token(token)
            scope["user"] = user
        else:
            scope["user"] = None
        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = RefreshToken.objects.verify_access_token(token)
            return User.objects.for_id(payload["sub"]).first()
        except Exception:
            return None


logger = logging.getLogger("server")
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("server").setLevel(logging.CRITICAL)
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
        access_token, _ = await database_sync_to_async(RefreshToken.objects.create)(self.user)

        communicator = WebsocketCommunicator(
            application,
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

        invalid_data = {
            "action": "new_message",
            "data": {
                "content": "A" * 257,
                "chat_id": str(self.chat.id)
            }
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)

        msg_count = await database_sync_to_async(ChatMessage.objects.count)()
        self.assertEqual(msg_count, 0)

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

        new_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="targetuser",
            password="testpass"
        )
        target_user = await database_sync_to_async(Profile.objects.get)(user=new_user)

        notification_data = {
            "action": "add_new_friend",
            "data": {
                "sender_id": str(self.profile.id),
                "receiver_id": str(target_user.id)
            }
        }
        await communicator.send_json_to(notification_data)

        # Attendre la réponse du consumer
        response = await communicator.receive_json_from()
        self.assertEqual(response["action"], "new_friend")

        # Vérification base
        notif_count = await database_sync_to_async(Notification.objects.count)()
        self.assertEqual(notif_count, 1)

        notification_id = response["data"]["id"]
        await communicator.send_json_to({
            "action": "read_notification",
            "data": {"id": notification_id}
        })
        # Vérification création notification
        notif_count = await database_sync_to_async(Notification.objects.count)()
        self.assertEqual(notif_count, 1)

        notification = await database_sync_to_async(Notification.objects.get)()
        self.assertTrue(notification.is_read)
