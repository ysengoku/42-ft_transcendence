from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from chat.models import GameInvitation
from chat.tests.test_security_chat_consumers import UserEventsConsumerTests
from users.models import Profile


class GameInvitationTests(UserEventsConsumerTests):

    async def test_game_invitation_creation(self):
        # Setup users
        sender = await database_sync_to_async(Profile.objects.create)()
        receiver = await database_sync_to_async(Profile.objects.create)()

        # Vérifier qu'aucune invitation n'existe
        initial_count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(initial_count, 0)

        # Simuler l'envoi d'invitation
        communicator = await self.get_authenticated_communicator()

        # Ignorer le message user_online automatique
        user_status = await communicator.receive_json_from()
        self.assertEqual(user_status["action"], "user_online")

        await communicator.send_json_to({
            "action": "game_invite",
            "data": {
                "sender_id": str(sender.id),
                "receiver_id": str(receiver.id)
            }
        })

        # Vérifier qu'une invitation a été créée
        final_count = await database_sync_to_async(GameInvitation.objects.count)()
        self.assertEqual(final_count, 1)

        # Vérifier les détails de l'invitation
        invitation = await database_sync_to_async(GameInvitation.objects.first)()
        self.assertEqual(invitation.sender, sender)
        self.assertEqual(invitation.recipient, receiver)
        self.assertEqual(invitation.status, "pending")

        await communicator.disconnect()
