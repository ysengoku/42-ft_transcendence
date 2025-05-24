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
        # Création émetteur
        sender_com = await self.get_authenticated_communicator(
            username="sender_test", password="testpass123"
        )

        # Recevoir le user_online initial
        initial_response = await sender_com.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        # Création récepteur
        receiver_user = await database_sync_to_async(
            get_user_model().objects.create_user
        )(username="receiver_test", password="testpass456")
        receiver_profile = await database_sync_to_async(lambda: receiver_user.profile)()

        # Envoi invitation (sans sender_id)
        await sender_com.send_json_to(
            {"action": "game_invite", "data": {
                "receiver_id": str(receiver_profile.id)}}
        )

        # Réception confirmation
        response = await receiver_user.receive_json_from(timeout=2)
        self.assertEqual(response["action"], "game_invite")

        # Vérification base
        invitation = await database_sync_to_async(GameInvitation.objects.first)()
        self.assertEqual(invitation.status, "pending")

        await sender_com.disconnect()
