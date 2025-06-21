import logging

from django.test import TestCase

from chat.models import GameInvitation
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings
from tournaments.models import Tournament
from users.models import User


# ruff: noqa: S106
class ProfileModelTests(TestCase):
    def setUp(self):
        self.user: User = User.objects.create_user("TestUser", email="user0@gmail.com", password="123")

    def test_get_active_game_participation_when_not_active_in_games(self):
        self.assertEqual(
            all(x is None for x in self.user.profile.get_active_game_participation()),
            True,
            "User should be able to participate in games when they are not active in matchmaking, tournaments or "
            "invitations",
        )

    def test_get_active_game_participation_when_active_in_matchmaking(self):
        game_room: GameRoom = GameRoom.objects.create(settings=get_default_game_room_settings())
        GameRoomPlayer.objects.create(
            game_room=game_room,
            profile=self.user.profile,
        )
        print(next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameRoom)), None))
        self.assertIsNotNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameRoom)), None),
            "User should not be able to participate in games when they are already active in matchmaking",
        )
        game_room.close()
        self.assertIsNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameRoom)), None),
            "User should be able to participate in games after they finished the game",
        )

    def test_get_active_game_participation_when_active_in_tournament(self):
        tournament: Tournament = Tournament.objects.validate_and_create(
            tournament_name="foobar",
            creator=self.user.profile,
            required_participants=4,
            alias="barfoo",
            settings=get_default_game_room_settings(),
        )
        self.assertIsNotNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, Tournament)), None),
            "User should not be able to participate in games when they are already active in a tournament",
        )
        tournament.status = Tournament.FINISHED
        tournament.save()
        self.assertIsNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, Tournament)), None),
            "User should be able to participate in games after finishing a tournament",
        )

    def test_can_participate_in_game_when_invited_someone(self):
        user2: User = User.objects.create_user("TestUser2", email="user1@gmail.com", password="123")
        game_invitation: GameInvitation = GameInvitation.objects.create(
            sender=self.user.profile,
            recipient=user2.profile,
            options=get_default_game_room_settings(),
        )
        self.assertIsNotNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameInvitation)), None),
            "User should not be able to participate in games after they invited someone",
        )

        game_invitation.status = GameInvitation.CANCELLED
        game_invitation.save()
        self.assertIsNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameInvitation)), None),
            "User should be able to participate in games after cancelling invite",
        )

        game_invitation.status = GameInvitation.ACCEPTED
        game_invitation.save()
        self.assertIsNone(
            next((x for x in self.user.profile.get_active_game_participation() if isinstance(x, GameInvitation)), None),
            "User should be able to participate in games after their invite was accepted",
        )
