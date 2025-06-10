import logging

from django.test import TestCase

from users.models import User

logger = logging.getLogger("server")

logging.disable(logging.CRITICAL)


class TestCreateTournamentEndpoint(TestCase):
    """
    Tests for the `POST /api/tournaments` endpoint.
    """

    def setUp(self):
        User.objects.create_user("TestUser", email="user0@gmail.com", password="123")  # noqa: S106
        self.user_auth = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "123"},
        )

    def _get_default_tournament_creation_data(self):
        return {
            "name": "Foo",
            "required_participants": 4,
            "alias": "Bar",
            "settings": {
                "game_speed": "medium",
                "score_to_win": 5,
                "time_limit": 3,
                "ranked": False,
                "cool_mode": False,
            },
        }

    def test_tournament_works_with_bad_data(self):
        response = self.client.post("/api/tournaments", content_type="application/json", data={"dummy": "dummy"})
        self.assertEqual(response.status_code, 422, "Response to bad data should be 422")

    def test_tournament_is_not_created_with_bad_number_of_participants(self):
        data_with_wrong_number_of_participants = self._get_default_tournament_creation_data()
        data_with_wrong_number_of_participants["required_participants"] = 5
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data_with_wrong_number_of_participants,
        )
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with number of participants other than 4 or 8 should be 422",
        )

    def test_tournament_is_not_created_with_incorrect_game_speed(self):
        data_with_wrong_game_speed = self._get_default_tournament_creation_data()
        data_with_wrong_game_speed["settings"]["game_speed"] = "asd"
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data_with_wrong_game_speed,
        )
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with wrong game speed should be 422",
        )

    def test_tournament_is_not_created_with_correct_bounds_for_score_to_win(self):
        data_with_wrong_game_speed = self._get_default_tournament_creation_data()
        data_with_wrong_game_speed["settings"]["score_to_win"] = 2
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data_with_wrong_game_speed,
        )
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with score to win lower than 3 should be 422",
        )

        data_with_wrong_game_speed["settings"]["score_to_win"] = 21
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with score to win greater than 20 should be 422",
        )

    def test_tournament_is_not_created_with_correct_bounds_for_time_limit(self):
        data_with_wrong_game_speed = self._get_default_tournament_creation_data()
        data_with_wrong_game_speed["settings"]["time_limit"] = 0
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data_with_wrong_game_speed,
        )
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with time limit lower than 1 should be 422",
        )

        data_with_wrong_game_speed["settings"]["time_limit"] = 6
        self.assertEqual(
            response.status_code,
            422,
            "Response to bad data with time limit greater than 5 should be 422",
        )

    def test_tournament_creates_with_valid_data(self):
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_default_tournament_creation_data(),
        )
        self.assertEqual(
            response.status_code,
            201,
            "Response to valid data should be 201",
        )
