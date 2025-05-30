import asyncio
import logging

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from chat.models import GameInvitation
from chat.tests.test_security_chat_consumers import UserEventsConsumerTests
from users.models import Profile

logger = logging.getLogger("server")

logging.getLogger("server").setLevel(logging.CRITICAL)
logging.getLogger("server").setLevel(logging.INFO)


class GameInvitationTests(UserEventsConsumerTests):
    async def test_game_invite_with_invalid_options(self):
        communicator = await self.get_authenticated_communicator()

        # Not a dict
        invalid_data_1 = {
            "action": "game_invite",
            "data": {
                "username": "targetuser",
                "client_id": "client_id",
                "options": "bullshit",
            },
        }
        with self.assertLogs("server", level="WARNING") as logs:
            await communicator.send_json_to(invalid_data_1)
            await communicator.receive_nothing(timeout=0.1)
            assert any("Invalid type for 'options'" in log for log in logs.output)

        # 2. Invalid game_speed
        invalid_data_2 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "ultrafast",
                    "is_ranked": True,
                    "score_to_win": 3,
                    "time_limit_minutes": 3,
                },
            },
        }
        await communicator.send_json_to(invalid_data_2)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        # 3. Invalid is_ranked
        invalid_data_2 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "fast",
                    "is_ranked": "true",
                    "score_to_win": 3,
                    "time_limit_minutes": 3,
                },
            },
        }
        await communicator.send_json_to(invalid_data_2)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        # 4. Invalid score_to_win
        invalid_data_2 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "fast",
                    "is_ranked": True,
                    "score_to_win": 2,
                    "time_limit_minutes": 3,
                },
            },
        }
        await communicator.send_json_to(invalid_data_2)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        # 5. Invalid time_limit_minutes
        invalid_data_2 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "fast",
                    "is_ranked": True,
                    "score_to_win": 3,
                    "time_limit_minutes": 6,
                },
            },
        }
        await communicator.send_json_to(invalid_data_2)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        # 6. A value is None
        invalid_data_2 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "fast",
                    "is_ranked": True,
                    "score_to_win": 3,
                    "time_limit_minutes": None,
                },
            },
        }
        await communicator.send_json_to(invalid_data_2)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        # 7. Incomplete dict
        invalid_data_3 = {
            "action": "game_invite",
            "client_id": "client_id",
            "data": {
                "username": "targetuser",
                "options": {
                    "game_speed": "slow",
                },
            },
        }
        await communicator.send_json_to(invalid_data_3)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 0

        await communicator.disconnect()

    async def test_game_invite_valid_creates_invitation_slow_min(self):
        target_user = await self.get_authenticated_communicator(
            username="target_user", password="testpass",
        )

        communicator = await self.get_authenticated_communicator()

        valid_data = {
            "action": "game_invite",
            "data": {
                "username": "target_user",
                "client_id": "client_id",
                "options": {
                    "game_speed": "slow",
                    "is_ranked": False,
                    "score_to_win": 3,
                    "time_limit_minutes": 1,
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
                "username": "target_user",
                "client_id": "client_id",
                "options": {
                    "game_speed": "normal",
                    "is_ranked": True,
                    "score_to_win": 10,
                    "time_limit_minutes": 3,
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
                "username": "target_user",
                "client_id": "client_id",
                "options": {
                    "game_speed": "fast",
                    "is_ranked": True,
                    "score_to_win": 20,
                    "username": "target_user",
                    "time_limit_minutes": 5,
                },
            },
        }
        await communicator.send_json_to(valid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await target_user.disconnect()

    async def test_game_invite_valid_creates_invitation_any(self):
        target_user = await self.get_authenticated_communicator(
            username="target_user", password="testpass",
        )

        communicator = await self.get_authenticated_communicator()

        valid_data = {
            "action": "game_invite",
            "data": {
                "username": "target_user",
                "client_id": "client_id",
                "options": {
                    "game_speed": "any",
                    "is_ranked": "any",
                    "score_to_win": "any",
                    "time_limit_minutes": "any",
                },
            },
        }
        await communicator.send_json_to(valid_data)
        await communicator.receive_nothing(timeout=0.1)
        count = await database_sync_to_async(GameInvitation.objects.count)()
        assert count == 1

        await communicator.disconnect()
        await target_user.disconnect()

    async def test_game_invite_valid_canceled_after_accept_other(self):
        john = await self.get_authenticated_communicator(
            username="john", password="testpass",
        )
        sleepy_joe = await self.get_authenticated_communicator(
            username="sleepy_joe", password="testpass",
        )
        communicator = await self.get_authenticated_communicator(
            username="communicator", password="testpass",
        )
        invite_sleepy_joe = {
            "action": "game_invite",
            "data": {
                "username": "sleepy_joe",
                "client_id": "client_id",
                "options": {
                    "game_speed": "any",
                    "is_ranked": "any",
                    "score_to_win": "any",
                    "time_limit_minutes": "any",
                },
            },
        }

        invite_communicator = {
            "action": "game_invite",
            "data": {
                "username": "communicator",
                "client_id": "client_id",
                "options": {
                    "game_speed": "any",
                    "is_ranked": "any",
                    "score_to_win": "any",
                    "time_limit_minutes": "any",
                },
            },
        }

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

        accept_invite = {
            "action": "reply_game_invite",
            "data": {
                "accept": True,
                "username": "john",
                "client_id": "client_id",
            },
        }
        await communicator.send_json_to(accept_invite)
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
