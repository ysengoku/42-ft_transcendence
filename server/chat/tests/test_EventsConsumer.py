
import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase, TransactionTestCase

from chat.routing import websocket_urlpatterns
from chat.views import notifications_view
from server.asgi import application

User = get_user_model()


class TestEventsConsumer(TestCase):
    # def test_connect(self):
    #     communicator = WebsocketCommunicator(application, "/ws/events/")
    #     connected, _ = communicator.connect()
    #     self.assertTrue(connected)
    #     communicator.disconnect()
    #
    @pytest.mark.asyncio
    async def test_connect():
        communicator = WebsocketCommunicator(application, "/ws/events/")
        connected, _ = await communicator.connect()
        assert connected is True  # Vérification que la connexion a réussi
        self.assertTrue(connected)  # Vérification synchrone
        print(connected)
        await communicator.disconnect()

# class UserEventsConsumerTestCase(TransactionTestCase):
#     def test_connect(self):
#         user = User.objects.create_user(
#             username="testuser", password="password")
#         scope = {
#             "user": user,
#             "type": "websocket",
#             "path": "/ws/events/",
#             "headers": [],
#         }
#
#     communicator = WebsocketCommunicator(application, "/ws/events/")
#     connected, _ = async_to_sync(communicator.connect)()
#     # communicator = WebsocketCommunicator(
#     #     websocket_urlpatterns[0].callback, "/ws/events/", scope)
#     self.assertTrue(connected)  # Vérification synchrone
#     communicator.disconnect()
#

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
