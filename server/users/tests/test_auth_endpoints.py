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
