import logging
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from pong.models import Match
from users.models import User


class GameStatsEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user1 = User.objects.create_user("Player1", email="player1@example.com", password="TestPassword123")
        self.user2 = User.objects.create_user("Player2", email="player2@example.com", password="TestPassword123")
        self.user3 = User.objects.create_user("Player3", email="player3@example.com", password="TestPassword123")
        
        # Login as user1 by default
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player1", "password": "TestPassword123"},
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def test_get_daily_elo_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/game-stats/Player1/daily-elo")
        self.assertEqual(response.status_code, 401)

    def test_get_daily_elo_nonexistent_user(self):
        response = self.client.get("/api/game-stats/NonExistentPlayer/daily-elo")
        self.assertEqual(response.status_code, 404)

    def test_get_daily_elo_no_matches(self):
        response = self.client.get("/api/game-stats/Player1/daily-elo")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)
        self.assertEqual(len(response_data["items"]), 0)

    def test_get_daily_elo_with_matches(self):
        # Create matches with different dates
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        
        # Matches from today (user1 wins, gains elo)
        match1, _, _ = Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now().replace(hour=10)
        )
        
        # Match from yesterday (user1 loses, loses elo)
        Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now().replace(hour=15) - timedelta(days=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/daily-elo")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertGreater(response_data["count"], 0)
        
        # Check that we have elo data points
        for elo_point in response_data["items"]:
            self.assertIn("day", elo_point)
            self.assertIn("daily_elo_change", elo_point)
            self.assertIn("elo_result", elo_point)

    def test_get_daily_elo_pagination(self):
        # Create many matches across many days to test pagination
        base_date = timezone.now() - timedelta(days=30)
        for i in range(25):
            match_date = base_date + timedelta(days=i)
            Match.objects.resolve(
                winner_profile_or_id=self.user1.profile if i % 2 == 0 else self.user2.profile,
                loser_profile_or_id=self.user2.profile if i % 2 == 0 else self.user1.profile,
                winners_score=11,
                losers_score=5,
                date=match_date,
            )
        
        # Test first page
        response = self.client.get("/api/game-stats/Player1/daily-elo?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertLessEqual(len(response_data["items"]), 10)

    def test_get_matches_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/game-stats/Player1/matches")
        self.assertEqual(response.status_code, 401)

    def test_get_matches_nonexistent_user(self):
        response = self.client.get("/api/game-stats/NonExistentPlayer/matches")
        self.assertEqual(response.status_code, 404)

    def test_get_matches_no_matches(self):
        response = self.client.get("/api/game-stats/Player1/matches")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)
        self.assertEqual(len(response_data["items"]), 0)

    def test_get_matches_with_matches(self):
        # Create multiple matches
        match1 = Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        match2 = Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)
        self.assertEqual(len(response_data["items"]), 2)
        
        # Check match data structure
        for match in response_data["items"]:
            self.assertIn("opponent", match)
            self.assertIn("is_winner", match)
            self.assertIn("score", match)
            self.assertIn("game_id", match)
            self.assertIn("date", match)

    def test_get_matches_order_desc(self):
        # Create matches with different timestamps
        match1 = Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        match2 = Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches?order=desc")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # In desc order, newer matches should come first
        matches = response_data["items"]
        if len(matches) >= 2:
            # match2 (newer) should come before match1 (older)
            first_match_time = matches[0]["date"]
            second_match_time = matches[1]["date"]
            self.assertGreaterEqual(first_match_time, second_match_time)

    def test_get_matches_order_asc(self):
        # Create matches with different timestamps
        match1 = Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        match2 = Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches?order=asc")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # In asc order, older matches should come first
        matches = response_data["items"]
        if len(matches) >= 2:
            # match1 (older) should come before match2 (newer)
            first_match_time = matches[0]["date"]
            second_match_time = matches[1]["date"]
            self.assertLessEqual(first_match_time, second_match_time)

    def test_get_matches_filter_won_only(self):
        # Create mix of won and lost matches for user1
        Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches?result=won")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)  # Only 1 won match
        
        # Verify all returned matches are won by Player1
        for match in response_data["items"]:
            self.assertTrue(match["is_winner"])

    def test_get_matches_filter_lost_only(self):
        # Create mix of won and lost matches for user1
        Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches?result=lost")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)  # Only 1 lost match
        
        # Verify all returned matches are lost by Player1
        for match in response_data["items"]:
            self.assertFalse(match["is_winner"])

    def test_get_matches_filter_all(self):
        # Create mix of won and lost matches for user1
        Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now() - timedelta(hours=2),
        )
        
        Match.objects.resolve(
            winner_profile_or_id=self.user2.profile,
            loser_profile_or_id=self.user1.profile,
            winners_score=11,
            losers_score=8,
            date=timezone.now() - timedelta(hours=1),
        )
        
        response = self.client.get("/api/game-stats/Player1/matches?result=all")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)  # Both matches

    def test_get_matches_pagination(self):
        # Create many matches
        for i in range(25):
            Match.objects.resolve(
                winner_profile_or_id=self.user1.profile if i % 2 == 0 else self.user2.profile,
                loser_profile_or_id=self.user2.profile if i % 2 == 0 else self.user1.profile,
                winners_score=11,
                losers_score=5,
                date=timezone.now() - timedelta(hours=i),
            )
        
        # Test first page
        response = self.client.get("/api/game-stats/Player1/matches?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test second page
        response = self.client.get("/api/game-stats/Player1/matches?limit=10&offset=10")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)

    def test_get_match_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/game-stats/matches/nonexistent-id")
        self.assertEqual(response.status_code, 401)

    def test_get_match_nonexistent_match(self):
        response = self.client.get("/api/game-stats/matches/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Match not found", status_code=404)

    def test_get_match_invalid_uuid(self):
        response = self.client.get("/api/game-stats/matches/invalid-uuid")
        self.assertEqual(response.status_code, 422)

    def test_get_match_success(self):
        # Create a match
        match, _, _ = Match.objects.resolve(
            winner_profile_or_id=self.user1.profile,
            loser_profile_or_id=self.user2.profile,
            winners_score=11,
            losers_score=5,
            date=timezone.now(),
        )
        
        response = self.client.get(f"/api/game-stats/matches/{match.id}")
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        self.assertIn("winner", response_data)
        self.assertIn("loser", response_data)
