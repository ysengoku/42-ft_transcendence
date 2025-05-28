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

logging.getLogger("server").setLevel(logging.INFO)

# Search in every action and prints them if level logging is info
# Set Logging level to critical to avoid logs


async def get_next_action(communicator, expected_action, timeout=2):
    """
        Récupère le prochain message dont l'action correspond à expected_action.
        """
    end = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise TimeoutError(
                f"Timeout waiting for action {expected_action}")
        try:
            msg = await communicator.receive_json_from(timeout=remaining)
            logger.info(msg)
            if msg.get("action") == expected_action:
                return msg
        except asyncio.TimeoutError:
            raise


class GameInvitationTests(UserEventsConsumerTests):

    # Dans le test :

    async def test_game_invitation_creation(self):
        # Création émetteur
        sender_com = await self.get_authenticated_communicator(
            username="sender_test", password="testpass123"
        )
        receiver_com = await self.get_authenticated_communicator(
            username="receiver_test", password="testpass123"
        )
        # Recevoir le user_online initial
        initial_response = await sender_com.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        initial_response = await receiver_com.receive_json_from()
        self.assertEqual(initial_response["action"], "user_online")

        receiver_profile = await database_sync_to_async(lambda: receiver_com.scope["user"].profile)()
        receiver_username = receiver_com.scope["user"].username
        # Envoi invitation (sans sender_id)
        await sender_com.send_json_to({
            "action": "game_invite",
            "data": {
                "options": {
                      "game_speed": 1,
                      "is_ranked": True,
                    "score_to_win": 5,
                    "time_limit_minutes": 10,
                },
                "username": receiver_username
            }
        })
        # Réception confirmation
        # response = await sender_com.receive_json_from(timeout=2)
        # self.assertEqual(response["action"], "game_invite")

        response = await get_next_action(sender_com, "game_invite", timeout=2)
        self.assertEqual(response["action"], "game_invite")
        # response = await get_next_action(receiver_com, "game_invite", timeout=2)
        # self.assertEqual(response["action"], "game_invite")
        # Vérification base
        invitation = await database_sync_to_async(GameInvitation.objects.first)()
        self.assertEqual(invitation.status, "pending")

        await sender_com.disconnect()
        await receiver_com.disconnect()
