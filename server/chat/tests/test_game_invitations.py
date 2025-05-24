import asyncio
import logging

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase

from chat.models import GameInvitation
from chat.tests.test_security_chat_consumers import UserEventsConsumerTests
from users.models import Profile

logger = logging.getLogger("server")

logging.getLogger("server").setLevel(logging.CRITICAL)


class GameInvitationTests(UserEventsConsumerTests):

    async def test_game_invitation_creation(self):
        # Setup users
        sender = await database_sync_to_async(Profile.objects.create)()
        receiver = await database_sync_to_async(Profile.objects.create)()

        # Vérifier qu'aucune invitation n'existe
        initial_count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(initial_count, 0)

        # # Simuler l'envoi d'invitation
        communicator = await self.get_authenticated_communicator()
        #
        # # Ignorer le message user_online automatique
        user_status = await communicator.receive_json_from()
        self.assertEqual(user_status["action"], "user_online")

        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })
        await communicator.receive_nothing(timeout=0.1)
        # response = await communicator.receive_json_from()
        # self.assertEqual(response["action"], "game_invite")
        # Vérifier qu'une invitation a été créée
        final_count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(final_count, 1)

        # Vérifier les détails de l'invitation
        invitation = await database_sync_to_async(GameInvitation.objects.first)()
        self.assertEqual(invitation.sender, sender)
        self.assertEqual(invitation.recipient, receiver)
        self.assertEqual(invitation.status, "pending")

        await communicator.disconnect()

    async def test_game_invitation_creation_two(self):
        # Créer des Users complets avec Profile
        sender_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="sender",
            password="testpass"
        )
        receiver_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="receiver",
            password="testpass"
        )

        # Récupération asynchrone des profils
        sender = await database_sync_to_async(lambda: sender_user.profile)()
        receiver = await database_sync_to_async(lambda: receiver_user.profile)()

        communicator = await self.get_authenticated_communicator()

        initial_response = await communicator.receive_json_from()
        logger.critical(initial_response)
        self.assertEqual(initial_response["action"], "user_online")

        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })

        try:
            response = await communicator.receive_json_from(timeout=2)

            logger.critical(response)
            self.assertEqual(response["action"], "game_invite")
            self.assertEqual(response["data"]["id"], str(
                GameInvitation.objects.first().id))
        except asyncio.TimeoutError:
            self.fail("Timeout waiting for game_invite response")

        # Vérification de la création en base
        count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(count, 1)

        await communicator.disconnect()
        # # Attendre la réponse de confirmation
        # response = await communicator.receive_json_from()
        # self.assertEqual(response["action"], "game_invite")
        #
        # # Vérifier la base
        # count = await database_sync_to_async(GameInvitation.objects.count)()
        # self.assertEqual(count, 1)

    async def test_game_invitation_creation_two(self):
        # Création de l'utilisateur émetteur ET authentification avec lui
        sender_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="sender_test",
            password="testpass123"
        )

        # Création du récepteur
        receiver_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="receiver_test",
            password="testpass456"
        )

        # Récupération des profils
        sender = await database_sync_to_async(lambda: sender_user.profile)()
        receiver = await database_sync_to_async(lambda: receiver_user.profile)()

        # Connexion WebSocket AVEC l'émetteur
        communicator = await self.get_authenticated_communicator(user=sender_user)

        # Recevoir le message user_online initial
        initial_response = await communicator.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        # Envoi de l'invitation avec le sender_id correct
        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                # Correspond à l'utilisateur authentifié
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })

        # Réception de la réponse
        response = await communicator.receive_json_from(timeout=2)
        self.assertEqual(response["action"], "game_invite")

        # Vérification de la création en base
        count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(count, 1)

        await communicator.disconnect()

    async def test_game_invitation_creation_three(self):
        # Création de l'utilisateur émetteur ET authentification avec lui
        sender_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="sender_test",
            password="testpass123"
        )

        # Création du récepteur
        receiver_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="receiver_test",
            password="testpass456"
        )

        # Récupération des profils
        sender = await database_sync_to_async(lambda: sender_user.profile)()
        receiver = await database_sync_to_async(lambda: receiver_user.profile)()

        # Connexion WebSocket AVEC l'émetteur
        communicator = await self.get_authenticated_communicator(user=sender_user)

        # Recevoir le message user_online initial
        initial_response = await communicator.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        # Envoi de l'invitation avec le sender_id correct
        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                # Correspond à l'utilisateur authentifié
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })

        # Réception de la réponse
        response = await communicator.receive_json_from(timeout=2)
        self.assertEqual(response["action"], "game_invite")

        # Vérification de la création en base
        count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(count, 1)

        await communicator.disconnect()

    async def test_game_invitation_creation_four(self):
        # Création de l'utilisateur émetteur ET authentification avec lui
        sender_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="sender_test",
            password="testpass123"
        )

        # Création du récepteur
        receiver_user = await database_sync_to_async(get_user_model().objects.create_user)(
            username="receiver_test",
            password="testpass456"
        )

        # Récupération des profils
        sender = await database_sync_to_async(lambda: sender_user.profile)()
        receiver = await database_sync_to_async(lambda: receiver_user.profile)()

        # Connexion WebSocket AVEC l'émetteur
        communicator = await self.get_authenticated_communicator(user=sender_user)

        # Recevoir le message user_online initial
        initial_response = await communicator.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        # Envoi de l'invitation avec le sender_id correct
        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                # Correspond à l'utilisateur authentifié
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })

        # Réception de la réponse
        response = await communicator.receive_json_from(timeout=2)
        self.assertEqual(response["action"], "game_invite")

        # Vérification de la création en base
        count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(count, 1)

        await communicator.disconnect()
