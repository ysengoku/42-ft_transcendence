import asyncio
import logging

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from chat.models import GameInvitation
from chat.tests.test_security_chat_consumers import UserEventsConsumerTests
from users.models import Profile

logger = logging.getLogger("server")

logging.getLogger("server").setLevel(logging.CRITICAL)


RANKED = "ranked"
GAME_SPEED = "game_speed"
SCORE_TO_WIN = "score_to_win"
TIME_LIMIT = "time_limit"
COOL_MODE = "cool_mode"

def invite_player(player_name):
    return {
        "action": "game_invite",
        "data": {
            "username": player_name,
            "client_id": "client_id",
        },
    }


def accept_invite(sender_name):
    return {
        "action": "reply_game_invite",
        "data": {
            "accept": True,
            "username": sender_name,
            "client_id": "client_id",
        },
    }


async def fill_log_invitations_info(invite_status, profile_player=None):
    if profile_player:
        infos = await database_sync_to_async(
            lambda: [
                {
                    "id": inv.id,
                    "sender": inv.sender.user.username,
                    "recipient": inv.recipient.user.username,
                    "status": inv.status,
                }
                for inv in GameInvitation.objects.filter(sender=profile_player, status=invite_status).select_related("sender__user", "recipient__user")
            ],
        )()
    else:
        infos = await database_sync_to_async(
            lambda: [
                {
                    "id": inv.id,
                    "sender": inv.sender.user.username,
                    "recipient": inv.recipient.user.username,
                    "status": inv.status,
                }
                for inv in GameInvitation.objects.filter(status=invite_status).select_related("sender__user", "recipient__user")
            ],
        )()
    return infos


async def log_invitations(invite_status, profile_player=None):
    infos = await fill_log_invitations_info(invite_status, profile_player)

    for info in infos:
        logger.critical(
            "INVITATION: id=%s sender=%s recipient=%s status=%s",
            info["id"], info["sender"], info["recipient"], info["status"],
        )


class GameInvitationTests(UserEventsConsumerTests):
    async def test_not_a_dict(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        invalid_data = {
            "action": "game_invite",
            "data": {
                "username": "targetuser",
                "client_id": "client_id",
                "options": "not a dict",
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_invalid_game_speed(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        # 2. Invalid game_speed
        invalid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    GAME_SPEED: "ultrafast",
                },
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_invalid_ranked(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        invalid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    RANKED: "true",
                },
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_invalid_score_to_win(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        invalid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    SCORE_TO_WIN: 2,
                },
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_invalid_time_limit(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        invalid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    TIME_LIMIT: 6,
                },
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_invalid_None(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        # 2. Invalid game_speed
        invalid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    TIME_LIMIT: None,
                },
            },
        }
        await communicator.send_json_to(invalid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_game_invite_incomplete_dict(self):
        communicator = await self.get_authenticated_communicator()
        targetuser = await self.get_authenticated_communicator(
            username="targetuser", password="testpass",
        )

        # 7. Incomplete dict
        invalid_data_3 = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "targetuser",
                "options": {
                    GAME_SPEED: "slow",
                },
            },
        }
        await communicator.send_json_to(invalid_data_3)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await targetuser.disconnect()

    async def test_game_invite_valid_creates_invitation_slow_min(self):
        target_user = await self.get_authenticated_communicator(
            username="target_user", password="testpass",
        )

        communicator = await self.get_authenticated_communicator()

        valid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "target_user",
                "options": {
                    GAME_SPEED: "slow",
                    RANKED: False,
                    SCORE_TO_WIN: 3,
                    TIME_LIMIT: 1,
                },
            },
        }
        await communicator.send_json_to(valid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await target_user.disconnect()

    async def test_game_invite_valid_creates_invitation_medium_med(self):
        target_user = await self.get_authenticated_communicator(
            username="target_user", password="testpass",
        )

        communicator = await self.get_authenticated_communicator()

        valid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "target_user",
                "options": {
                    GAME_SPEED: "medium",
                    RANKED: True,
                    SCORE_TO_WIN: 10,
                    TIME_LIMIT: 3,
                },
            },
        }
        await communicator.send_json_to(valid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await target_user.disconnect()

    async def test_game_invite_valid_creates_invitation_fast_max(self):
        target_user = await self.get_authenticated_communicator(
            username="target_user", password="testpass",
        )

        communicator = await self.get_authenticated_communicator()

        valid_data = {
            "action": "game_invite",
            "data": {
                "client_id": "client_id",
                "username": "target_user",
                "options": {
                    GAME_SPEED: "fast",
                    RANKED: True,
                    SCORE_TO_WIN: 20,
                    "username": "target_user",
                    TIME_LIMIT: 5,
                },
            },
        }
        await communicator.send_json_to(valid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await target_user.disconnect()

    async def test_send_game_invite_canceled_if_other_is_accepted(self):
        john = await self.get_authenticated_communicator(
            username="john", password="testpass",
        )
        sleepy_joe = await self.get_authenticated_communicator(
            username="sleepy_joe", password="testpass",
        )
        communicator = await self.get_authenticated_communicator(
            username="communicator", password="testpass",
        )
        invite_sleepy_joe = invite_player("sleepy_joe")
        invite_communicator = invite_player("communicator")

        await communicator.send_json_to(invite_sleepy_joe)
        await communicator.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)  # Need sleeps for the count to be ok
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await john.send_json_to(invite_communicator)
        await john.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 2

        accepted_invite_from_john = accept_invite("john")
        await communicator.send_json_to(accepted_invite_from_john)
        await communicator.receive_nothing(timeout=0.1)
        communicator_user = await database_sync_to_async(get_user_model().objects.get)(username="communicator")
        communicator_profile = await database_sync_to_async(Profile.objects.get)(user=communicator_user)
        pending_invitations = await database_sync_to_async(
            lambda: list(GameInvitation.objects.filter(sender=communicator_profile, status="pending")),
        )()
        assert len(pending_invitations) == 0, f"Communicator still has pending invitations: {pending_invitations}"

        await communicator.disconnect()
        await john.disconnect()
        await sleepy_joe.disconnect()

    async def test_game_invite_not_accepted_if_already_in_game(self):
        john = await self.get_authenticated_communicator(
            username="john", password="testpass",
        )
        playing_joe = await self.get_authenticated_communicator(
            username="playing_joe", password="testpass",
        )
        communicator = await self.get_authenticated_communicator(
            username="communicator", password="testpass",
        )
        await communicator.send_json_to(invite_player("playing_joe"))
        await communicator.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await john.send_json_to(invite_player("communicator"))
        await john.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 2

        await playing_joe.send_json_to(accept_invite("communicator"))
        await playing_joe.receive_nothing(timeout=0.1)

        await communicator.send_json_to(accept_invite("john"))
        await communicator.receive_nothing(timeout=0.1)

        john_user = await database_sync_to_async(get_user_model().objects.get)(username="john")
        john_profile = await database_sync_to_async(Profile.objects.get)(user=john_user)
        accepted_invitations = await database_sync_to_async(
            lambda: list(GameInvitation.objects.filter(sender=john_profile, status="accepted")),
        )()
        assert len(accepted_invitations) == 0, f"The invitation has been accepted: {accepted_invitations}"

        await communicator.disconnect()
        await john.disconnect()
        await playing_joe.disconnect()

    async def test_game_invite_not_send_if_target_in_game(self):
        john = await self.get_authenticated_communicator(
            username="john", password="testpass",
        )
        playing_joe = await self.get_authenticated_communicator(
            username="playing_joe", password="testpass",
        )
        communicator = await self.get_authenticated_communicator(
            username="communicator", password="testpass",
        )
        await communicator.send_json_to(invite_player("playing_joe"))
        await communicator.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await playing_joe.send_json_to(accept_invite("communicator"))
        await playing_joe.receive_nothing(timeout=0.1)

        await john.send_json_to(invite_player("playing_joe"))
        await john.receive_nothing(timeout=0.1)
        await asyncio.sleep(0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        john_user = await database_sync_to_async(get_user_model().objects.get)(username="john")
        john_profile = await database_sync_to_async(Profile.objects.get)(user=john_user)
        accepted_invitations = await database_sync_to_async(
            lambda: list(GameInvitation.objects.filter(sender=john_profile, status="pending")),
        )()
        assert len(accepted_invitations) == 0, f"The invitation has been sent: {accepted_invitations}"

        await communicator.disconnect()
        await john.disconnect()
        await playing_joe.disconnect()
