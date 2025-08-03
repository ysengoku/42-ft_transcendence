import asyncio
import logging
import json

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from common.close_codes import CloseCodes
from pong.consumers.matchmaking import MatchmakingConsumer
from pong.models import GameRoom
from users.models import User, RefreshToken
from users.middleware import JWTWebsocketAuthMiddleware

class MatchmakingConsumerTests(TransactionTestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)

    def tearDown(self):
        logging.disable(logging.NOTSET)

    async def connect_to_route(self, user, access_token, qs: str = ""):
        headers = [
            (b"cookie", f"access_token={access_token}".encode("utf-8"))
        ]

        communicator = WebsocketCommunicator(JWTWebsocketAuthMiddleware(MatchmakingConsumer.as_asgi()), f"/ws/matchmaking/{qs}", headers=headers)
        connected, _ = await communicator.connect()
        return communicator

    async def get_authenticated_user_and_communicator(self, username, qs: str = "") -> tuple[User, WebsocketCommunicator]:
        user = await database_sync_to_async(User.objects.create_user)(username, password="123")
        access_token, _ = await database_sync_to_async(RefreshToken.objects.create)(user)

        communicator = await self.connect_to_route(user, access_token, qs)

        return user, communicator, access_token

    async def test_connect_when_user_is_not_authorized(self):
        communicator = WebsocketCommunicator(MatchmakingConsumer.as_asgi(), "/ws/matchmaking/")
        connected, _ = await communicator.connect()
        
        output = await communicator.receive_output()
        self.assertEqual(output["type"], "websocket.close", "Connection should be closed for unauthorized users")
        self.assertEqual(output["code"], CloseCodes.ILLEGAL_CONNECTION, f"Close code for unauthorized users should be {CloseCodes.ILLEGAL_CONNECTION}")

        await communicator.disconnect()

    async def test_connect_when_user_is_authorized(self):
        user1, communicator1, _ = await self.get_authenticated_user_and_communicator("TestUser1")
        user2, communicator2, _ = await self.get_authenticated_user_and_communicator("TestUser2")

        output1 = await communicator1.receive_json_from()
        output2 = await communicator2.receive_json_from()

        assert output1["action"] == "game_found" and output1["username"] == "TestUser2", "TestUser1 should find TestUser2"
        assert output2["action"] == "game_found" and output2["username"] == "TestUser1", "TestUser2 should find TestUser1"
        assert output1["game_room_id"] == output2["game_room_id"], "Users should receive the same game_room_id in game_found action"
        assert "elo" in output1 and "avatar" in output1 and "nickname" in output1, "Users should receive the data on their opponent in game_found actiony"
        assert "elo" in output2 and "avatar" in output2 and "nickname" in output2, "Users should receive the data on their opponent in game_found actiony"

        await communicator1.disconnect()
        await communicator2.disconnect()

    async def test_connect_when_user_is_already_in_game(self):
        user1, communicator1, access_token1 = await self.get_authenticated_user_and_communicator("TestUser1")
        user2, communicator2, _ = await self.get_authenticated_user_and_communicator("TestUser2")

        output1 = await communicator1.receive_json_from()
        output2 = await communicator2.receive_json_from()

        connection_while_in_game = await self.connect_to_route(user1, access_token1)

        output = await connection_while_in_game.receive_output()
        self.assertEqual(output["type"], "websocket.close", "Connection should be closed for users already in the game")
        self.assertEqual(output["code"], CloseCodes.ALREADY_IN_GAME, f"Close code for users already in the game should be {CloseCodes.ALREADY_IN_GAME}")

        await communicator1.disconnect()
        await communicator2.disconnect()
        await connection_while_in_game.disconnect()

    async def test_connect_with_bad_game_room_settings(self):
        _, communicator, _ = await self.get_authenticated_user_and_communicator("TestUser1", "?score_to_win=21")

        output = await communicator.receive_output()

        self.assertEqual(output["type"], "websocket.close", "Connection should be closed for users who provided invalid game settings")
        self.assertEqual(output["code"], CloseCodes.BAD_DATA, f"Close code for users who provided bad data should be {CloseCodes.BAD_DATA}")

        await communicator.disconnect()

    async def test_connect_with_same_good_game_room_settings(self):
        settings = "?score_to_win=14&ranked=true&cool_mode=false"
        user1, communicator1, _ = await self.get_authenticated_user_and_communicator("TestUser1", settings)
        user2, communicator2, _ = await self.get_authenticated_user_and_communicator("TestUser2", settings)

        output1 = await communicator1.receive_json_from()
        output2 = await communicator2.receive_json_from()

        assert output1["action"] == "game_found" and output1["username"] == "TestUser2", "TestUser1 should find TestUser2"
        assert output2["action"] == "game_found" and output2["username"] == "TestUser1", "TestUser2 should find TestUser1"
        
        try:
            game_room: GameRoom = await database_sync_to_async(GameRoom.objects.get)(id=output1["game_room_id"], settings__score_to_win=14, settings__ranked=True, settings__cool_mode=False)
        except GameRoom.DoesNotExist:
            self.fail("Game Room with respective settings should be created in the database")

        await communicator1.disconnect()
        await communicator2.disconnect()

    async def test_connect_with_same_good_game_room_settings(self):
        settings1 = "?score_to_win=14&ranked=true&cool_mode=false"
        settings2 = "?score_to_win=10&ranked=true&cool_mode=false"
        user1, communicator1, _ = await self.get_authenticated_user_and_communicator("TestUser1", settings1)
        user2, communicator2, _ = await self.get_authenticated_user_and_communicator("TestUser2", settings2)

        try:
            output1 = await communicator1.receive_json_from()
            output2 = await communicator2.receive_json_from()
            self.fail("TestUser1 and TestUser2 should NOT be matched against each other due to conflict in settings")
        except asyncio.TimeoutError:
            pass
        
        assert await database_sync_to_async(GameRoom.objects.count)() == 2, "There should be 2 separate game rooms for each of the users"

        await communicator1.disconnect()
        await communicator2.disconnect()
