import logging

from django.test import TestCase

from chat.models import GameInvitation
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings
from tournaments.models import Tournament
from users.models import User


# ruff: noqa: S106
class LoginEndpointTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        User.objects.create_user("TestUser", email="user0@gmail.com", password="123")

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def test_login_works_with_bad_data(self):
        response = self.client.post("/api/login", content_type="application/json", data={"dummy": "dummy"})
        self.assertEqual(response.status_code, 422, "Response to bad data should be 422")

    def test_login_works_with_empty_data(self):
        response = self.client.post("/api/login", content_type="application/json")
        self.assertEqual(response.status_code, 422, "Response to empty data should be 422")

    def test_login_works_with_incorrect_credentials(self):
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "foo", "password": "bar"},
        )
        self.assertContains(response, "Username or password are not correct.", status_code=401)

    def test_login_works_with_correct_credentials(self):
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "123"},
        )
        self.assertEqual(response.status_code, 200, "Status code for successeful login should be 200")
        self.assertEqual(
            response.json(),
            {
                "username": "TestUser",
                "nickname": "TestUser",
                "avatar": "/img/default_avatar.png",
                "elo": 1000,
                "is_online": False,
            },
            "Invalid data on login",
        )


class ProfileModelTests(TestCase):
    def setUp(self):
        self.user: User = User.objects.create_user("TestUser", email="user0@gmail.com", password="123")

    def test_can_participate_in_game_when_not_active_in_games(self):
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            True,
            "User should be able to participate in games when they are not active in matchmaking, tournaments or "
            "invitations",
        )

    def test_can_participate_in_game_when_active_in_matchmaking(self):
        game_room: GameRoom = GameRoom.objects.create(settings=get_default_game_room_settings())
        GameRoomPlayer.objects.create(
            game_room=game_room,
            profile=self.user.profile,
        )
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            False,
            "User should not be able to participate in games when they are already active in matchmaking",
        )
        game_room.close()
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            True,
            "User should be able to participate in games after they finished the game",
        )

    def test_can_participate_in_game_when_active_in_tournament(self):
        tournament: Tournament = Tournament.objects.validate_and_create(
            tournament_name="foobar",
            creator=self.user.profile,
            required_participants=4,
            alias="barfoo",
            settings=get_default_game_room_settings(),
        )
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            False,
            "User should not be able to participate in games when they are already active in a tournament",
        )
        tournament.status = Tournament.FINISHED
        tournament.save()
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            True,
            "User should be able to participate in games after finishing a tournament",
        )

    def test_can_participate_in_game_when_invited_someone(self):
        user2: User = User.objects.create_user("TestUser2", email="user1@gmail.com", password="123")
        game_invitation: GameInvitation = GameInvitation.objects.create(
            sender=self.user.profile,
            recipient=user2.profile,
            options=get_default_game_room_settings(),
        )
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            False,
            "User should not be able to participate in games after they invited someone",
        )

        game_invitation.status = GameInvitation.CANCELLED
        game_invitation.save()
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            True,
            "User should be able to participate in games after cancelling invite",
        )

        game_invitation.status = GameInvitation.ACCEPTED
        game_invitation.save()
        self.assertEqual(
            self.user.profile.can_participate_in_game(),
            True,
            "User should be able to participate in games after their invite was accepted",
        )
