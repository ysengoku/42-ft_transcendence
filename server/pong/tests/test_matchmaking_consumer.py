import asyncio
import logging
import json

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from common.close_codes import CloseCodes
from pong.consumers.matchmaking import MatchmakingConsumer
from users.models import User, RefreshToken
from users.middleware import JWTWebsocketAuthMiddleware

class MatchmakingConsumerTests(TransactionTestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)

    def tearDown(self):
        logging.disable(logging.NOTSET)

    async def get_authenticated_communicator(self, username) -> tuple[User, WebsocketCommunicator]:
        user = await database_sync_to_async(User.objects.create_user)(username, password="123")
        access_token, refresh_token = await database_sync_to_async(RefreshToken.objects.create)(user)

        headers = [
            (b"cookie", f"access_token={access_token}".encode("utf-8"))
        ]

        communicator = WebsocketCommunicator(JWTWebsocketAuthMiddleware(MatchmakingConsumer.as_asgi()), "/ws/matchmaking/", headers=headers)
        connected, _ = await communicator.connect()

        return user, communicator

    async def test_connect_when_user_is_not_authorized(self):
        communicator = WebsocketCommunicator(MatchmakingConsumer.as_asgi(), "/ws/matchmaking/")
        connected, _ = await communicator.connect()
        
        output = await communicator.receive_output()
        self.assertEqual(output["type"], "websocket.close", "Connection should be closed for unauthorized users")
        self.assertEqual(output["code"], CloseCodes.ILLEGAL_CONNECTION, f"Close code for unauthorized users should be {CloseCodes.ILLEGAL_CONNECTION}")

        communicator.disconnect()

    async def test_connect_when_user_is_authorized(self):
        user1, communicator1 = await self.get_authenticated_communicator("TestUser1")
        user2, communicator2 = await self.get_authenticated_communicator("TestUser2")

        output1 = await communicator1.receive_json_from()
        output2 = await communicator2.receive_json_from()

        assert output1["action"] == "game_found" and output1["username"] == "TestUser2", "TestUser1 should find TestUser2"
        assert output2["action"] == "game_found" and output2["username"] == "TestUser1", "TestUser2 should find TestUser1"

        communicator1.disconnect()
        communicator2.disconnect()
