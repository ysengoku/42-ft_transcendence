
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase

from chat.routing import websocket_urlpatterns
from chat.views import notifications_view
from server.asgi import application

User = get_user_model()


class TestNotificationsViewTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser', password='12345')

    def test_notifications_view(self):
        request = self.factory.get('/chat/notifications/test/')
        request.user = self.user  # Simuler un utilisateur connecté
        response = notifications_view(request)
        self.assertEqual(response.status_code, 200)


class UserEventsConsumerTestCase(TestCase):
    def test_connect(self):
        user = User.objects.create_user(
            username="testuser", password="password")
        scope = {
            "user": user,
            "type": "websocket",
            "path": "/ws/events/",
            "headers": [],
        }

        communicator = WebsocketCommunicator(
            websocket_urlpatterns[0].callback, "/ws/events/", scope)
        connected, _ = communicator.connect()
        self.assertTrue(connected)  # Vérification synchrone
        communicator.disconnect()


# class UserEventsConsumerTestCase(TestCase):
#     async def test_connect(self):
#         user = await sync_to_async(User.objects.create_user)(
#             username="testuser", password="password"
#         )
#
#         # Importer le modèle Profile
#         from users.models import Profile
#
#         # Vérifiez si un profil existe déjà pour cet utilisateur
#         profile_exists = await sync_to_async(lambda: Profile.objects.filter(user=user).exists())()
#
#         if not profile_exists:
#             await sync_to_async(lambda: Profile.objects.create(user=user))()
#
#         scope = {
#             "user": user,
#             "type": "websocket",
#             "path": "/ws/events/",
#             "headers": [],
#         }
#
#         # Utiliser le bon callback
#         communicator = WebsocketCommunicator(
#             websocket_urlpatterns[0].callback, "/ws/events/", scope)
#
#         # Essayer de se connecter plusieurs fois si nécessaire
#         for _ in range(3):
#             connected, _ = await communicator.connect()
#             if connected:
#                 break
#
#         self.assertTrue(connected)
#
#         # Vérifiez que vous recevez un message de bienvenue
#         try:
#             response = await communicator.receive_json_from()
#             self.assertEqual(response, {"message": "Welcome!"})
#         except asyncio.TimeoutError:
#             print("Timeout lors de la réception du message de bienvenue.")
#
#         await communicator.disconnect()
