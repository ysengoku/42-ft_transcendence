import asyncio
import logging
import json

from channels.routing import URLRouter
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from common.close_codes import CloseCodes
from pong.consumers.game_ws_server import GameServerConsumer
from pong.models import GameRoom
from users.models import User, RefreshToken
from users.middleware import JWTWebsocketAuthMiddleware
from server.asgi import combined_patterns

class GameServerConsumerTests(TransactionTestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)

    def tearDown(self):
        logging.disable(logging.NOTSET)

    async def connect_to_route(self, user, access_token, game_room_id: str):
        headers = [
            (b"cookie", f"access_token={access_token}".encode("utf-8"))
        ]

        communicator = WebsocketCommunicator(JWTWebsocketAuthMiddleware(URLRouter(combined_patterns)), f"/ws/pong/{game_room_id}/", headers=headers)
        connected, _ = await communicator.connect()
        return communicator

    async def get_authenticated_user_and_communicator(self, username, game_room_id) -> tuple[User, WebsocketCommunicator]:
        user = await database_sync_to_async(User.objects.create_user)(username, password="123")
        access_token, _ = await database_sync_to_async(RefreshToken.objects.create)(user)

        communicator = await self.connect_to_route(user, access_token, game_room_id)

        return user, communicator, access_token

    async def test_connect_when_game_room_id_is_invalid(self):
        _, communicator, _ = await self.get_authenticated_user_and_communicator("TestUser1", 123)

        output = await communicator.receive_output()
        assert output["type"] == "websocket.close", "Connection should be closed on user that tries to connect to non-existent game"
        assert output["code"] == CloseCodes.ILLEGAL_CONNECTION, f"Connection should be closed with code {CloseCodes.ILLEGAL_CONNECTION} when user tries to connect to non-existent game"

        await communicator.disconnect()

    async def test_connect_when_user_is_not_authorized(self):
        user = await database_sync_to_async(User.objects.create_user)("TestUser1", password="123")
        communicator = await self.connect_to_route(user, "", "123")
        output = await communicator.receive_output()

        assert output["type"] == "websocket.close", "Connection should be closed on unauthorized user"
        assert output["code"] == CloseCodes.ILLEGAL_CONNECTION, f"Connection should be closed with code {CloseCodes.ILLEGAL_CONNECTION} when unauthorized user tries to connect"

        await communicator.disconnect()

    async def test_connect_when_user_is_not_part_of_the_game(self):
        user_in_game_room1 = await database_sync_to_async(User.objects.create_user)("TestUser1", password="123")
        user_in_game_room2 = await database_sync_to_async(User.objects.create_user)("TestUser2", password="123")
        game_room: GameRoom = await database_sync_to_async(GameRoom.objects.create)(status="ongoing")
        await database_sync_to_async(game_room.add_player)(user_in_game_room1.profile)
        await database_sync_to_async(game_room.add_player)(user_in_game_room2.profile)
        _, communicator, _ = await self.get_authenticated_user_and_communicator("IllegalUser", game_room.id)
        output = await communicator.receive_output()

        assert output["type"] == "websocket.close", "Connection should be closed on user who is not a part of the game room"
        assert output["code"] == CloseCodes.ILLEGAL_CONNECTION, f"Connection should be closed with code {CloseCodes.ILLEGAL_CONNECTION} when user who is not a part of the game tries to connect"

        await communicator.disconnect()

    async def test_connect_when_user_is_already_connected(self):
        user_in_game_room1 = await database_sync_to_async(User.objects.create_user)("TestUser1", password="123")
        user_in_game_room2 = await database_sync_to_async(User.objects.create_user)("TestUser2", password="123")
        game_room: GameRoom = await database_sync_to_async(GameRoom.objects.create)(status="ongoing")
        await database_sync_to_async(game_room.add_player)(user_in_game_room1.profile)
        await database_sync_to_async(game_room.add_player)(user_in_game_room2.profile)

        access_token, _ = await database_sync_to_async(RefreshToken.objects.create)(user_in_game_room1)
        communicator1 = await self.connect_to_route(user_in_game_room1, access_token, game_room.id)
        communicator2 = await self.connect_to_route(user_in_game_room1, access_token, game_room.id)

        output = await communicator2.receive_output()

        assert output["type"] == "websocket.close", "Connection should be closed on user who is already connected to the game room"
        assert output["code"] == CloseCodes.ALREADY_IN_GAME, f"Connection should be closed with code {CloseCodes.ALREADY_IN_GAME} when user who is already connected to the game room tries to connect"

        await communicator1.disconnect()
        await communicator2.disconnect()
