import logging

from django.test import TestCase

from chat.models import GameInvitation
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings
from tournaments.models import Tournament
from users.models import User


# ruff: noqa: S106
class AuthEndpointsTests(TestCase):
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


class UsersEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.users: dict[User] = {}
        for i in range(5):
            self.users[f"TestUser{i}"] = User.objects.create_user(f"TestUser{i}", email=f"user{i}@gmail.com", password="123")

        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser0", "password": "123"},
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def test_get_users_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/users", content_type="application/json")
        self.assertEqual(response.status_code, 401, "Response to get users endpoint while logged out should be 401")

    def test_get_users_while_logged_in(self):
        response = self.client.get("/api/users", content_type="application/json")
        self.assertEqual(response.status_code, 200, "Response to get users endpoint while logged in should be 200")

    def test_get_users_visibility_for_blocked_users(self):
        self.users["TestUser0"].profile.block_user(self.users["TestUser1"].profile)
        self.users["TestUser0"].profile.block_user(self.users["TestUser2"].profile)
        self.users["TestUser3"].profile.block_user(self.users["TestUser0"].profile)
        response = self.client.get("/api/users", content_type="application/json")
        blocked_TestUser1 = next((item for item in response.json()["items"] if item["username"] == "TestUser1"), None)
        blocked_TestUser2 = next((item for item in response.json()["items"] if item["username"] == "TestUser2"), None)
        user_who_blocked_TestUser0 = next((item for item in response.json()["items"] if item["username"] == "TestUser3"), None)
        self.assertIsNotNone(blocked_TestUser1, "User should see users who they blocked")
        self.assertIsNotNone(blocked_TestUser2, "User should see users who they blocked")
        self.assertIsNone(user_who_blocked_TestUser0, "User should not see users who blocked them")
