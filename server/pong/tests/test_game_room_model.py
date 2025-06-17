import logging

from django.test import TestCase

from chat.models import GameInvitation
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings
from tournaments.models import Tournament
from users.models import User


class GameRoomModelTests(TestCase):
    def setUp(self):
        self.user1: User = User.objects.create_user("Pedro", email="user1@gmail.com", password="123")
        self.user2: User = User.objects.create_user("Juan", email="user2@gmail.com", password="123")

    def test_is_in_tournament_when_it_is_not_in_tournament(self):
        game_room: GameRoom = GameRoom.objects.create()
        game_room.add_player(self.user1.profile)
        game_room.add_player(self.user2.profile)
        self.assertEqual(
            game_room.is_in_tournament(),
            False,
            ".is_in_tournament() should give False when it's not tied to any Bracket"
        )

    def test_is_in_tournament_when_it_is_in_tournament(self):
        game_room: GameRoom = GameRoom.objects.create()
        game_room.add_player(self.user1.profile)
        game_room.add_player(self.user2.profile)
        self.assertEqual(
            game_room.is_in_tournament(),
            True,
            "idk how to test it yet lol"
        )
