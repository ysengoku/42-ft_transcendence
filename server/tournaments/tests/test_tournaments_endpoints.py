import logging
from unittest.mock import patch
from uuid import uuid4

from django.test import TestCase

from tournaments.models import Participant, Round, Tournament
from users.models import User


class TournamentsEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user1 = User.objects.create_user("Player1", email="player1@example.com", password="TestPassword123")
        self.user2 = User.objects.create_user("Player2", email="player2@example.com", password="TestPassword123")
        self.user3 = User.objects.create_user("Player3", email="player3@example.com", password="TestPassword123")
        self.user4 = User.objects.create_user("Player4", email="player4@example.com", password="TestPassword123")
        
        # Login as user1 by default
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player1", "password": "TestPassword123"},
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def _get_tournament_creation_data(self, required_participants=4):
        return {
            "name": "Test Tournament",
            "required_participants": required_participants,
            "alias": "TestAlias",
            "settings": {
                "game_speed": "medium",
                "score_to_win": 11,
                "time_limit": 3,
                "ranked": True,
                "cool_mode": False,
            },
        }

    def test_create_tournament_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        self.assertEqual(response.status_code, 401)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_create_tournament_success_4_players(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(4),
        )
        self.assertEqual(response.status_code, 201)
        
        response_data = response.json()
        self.assertEqual(response_data["name"], "Test Tournament")
        self.assertEqual(response_data["required_participants"], 4)
        self.assertEqual(response_data["status"], Tournament.PENDING)
        self.assertEqual(response_data["tournament_creator"]["profile"]["username"], "Player1")
        
        # Verify tournament was created in database
        tournament = Tournament.objects.filter(name="Test Tournament").first()
        self.assertIsNotNone(tournament)
        self.assertEqual(tournament.creator, self.user1.profile)
        
        # Verify rounds were created (2 rounds for 4 players)
        rounds = Round.objects.filter(tournament=tournament)
        self.assertEqual(rounds.count(), 2)
        
        # Verify WebSocket and notification were called
        mock_async_to_sync.assert_called_once()
        mock_notification.assert_called_once()

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_create_tournament_success_8_players(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(8),
        )
        self.assertEqual(response.status_code, 201)
        
        response_data = response.json()
        self.assertEqual(response_data["required_participants"], 8)
        
        # Verify tournament was created with correct rounds (3 rounds for 8 players)
        tournament = Tournament.objects.filter(name="Test Tournament").first()
        rounds = Round.objects.filter(tournament=tournament)
        self.assertEqual(rounds.count(), 3)

    def test_create_tournament_invalid_participants(self):
        data = self._get_tournament_creation_data()
        data["required_participants"] = 6  # Invalid number (not 4 or 8)
        
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_tournament_invalid_name(self):
        data = self._get_tournament_creation_data()
        data["name"] = ""  # Empty name
        
        response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data,
        )
        self.assertEqual(response.status_code, 422)

    def test_create_tournament_while_in_game(self):
        # TODO: This would require creating a game room and adding the user
        # For now, we'll test the basic validation
        pass

    def test_get_tournament_nonexistent(self):
        nonexistent_id = uuid4()
        response = self.client.get(f"/api/tournaments/{nonexistent_id}")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Tournament not found", status_code=404)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_get_tournament_success(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament first
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Get the tournament
        response = self.client.get(f"/api/tournaments/{tournament_id}")
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        self.assertEqual(response_data["name"], "Test Tournament")
        self.assertEqual(response_data["required_participants"], 4)
        self.assertEqual(response_data["tournament_creator"]["profile"]["username"], "Player1")

    def test_get_all_tournaments_empty(self):
        response = self.client.get("/api/tournaments")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)
        self.assertEqual(len(response_data["items"]), 0)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_get_all_tournaments_with_data(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create multiple tournaments
        self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        
        # Login as different user and create another tournament
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        data2 = self._get_tournament_creation_data()
        data2["name"] = "Second Tournament"
        data2["alias"] = "SecondAlias"
        self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=data2,
        )
        
        # Get all tournaments
        response = self.client.get("/api/tournaments")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)
        self.assertEqual(len(response_data["items"]), 2)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_get_all_tournaments_filter_by_status(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        
        # Test filter by pending status
        response = self.client.get("/api/tournaments?status=pending")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)
        
        # Test filter by ongoing status (should be empty)
        response = self.client.get("/api/tournaments?status=ongoing")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_delete_tournament_while_logged_out(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Logout and try to delete
        self.client.delete("/api/logout")
        response = self.client.delete(f"/api/tournaments/{tournament_id}")
        self.assertEqual(response.status_code, 401)

    def test_delete_tournament_nonexistent(self):
        nonexistent_id = uuid4()
        response = self.client.delete(f"/api/tournaments/{nonexistent_id}")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Tournament not found", status_code=404)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_delete_tournament_not_creator(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament as Player1
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Login as Player2 and try to delete
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        response = self.client.delete(f"/api/tournaments/{tournament_id}")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "you are not allowed to cancel this tournament", status_code=403)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.close_tournament_invitations")
    def test_delete_tournament_success(self, mock_close_invitations, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Delete the tournament
        response = self.client.delete(f"/api/tournaments/{tournament_id}")
        self.assertEqual(response.status_code, 204)
        
        # Verify tournament status was changed to cancelled
        tournament = Tournament.objects.get(id=tournament_id)
        self.assertEqual(tournament.status, Tournament.CANCELLED)
        
        # Verify close invitations was called
        mock_close_invitations.assert_called_once()

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_delete_tournament_ongoing(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament and set it to ongoing
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        tournament = Tournament.objects.get(id=tournament_id)
        tournament.status = Tournament.ONGOING
        tournament.save()
        
        # Try to delete ongoing tournament
        response = self.client.delete(f"/api/tournaments/{tournament_id}")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "You cannot cancel an ongoing tournament", status_code=403)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_register_for_tournament_while_logged_out(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Logout and try to register
        self.client.delete("/api/logout")
        response = self.client.post(f"/api/tournaments/{tournament_id}/register?alias=TestPlayer")
        self.assertEqual(response.status_code, 401)

    def test_register_for_tournament_nonexistent(self):
        nonexistent_id = uuid4()
        response = self.client.post(f"/api/tournaments/{nonexistent_id}/register?alias=TestPlayer")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Tournament not found", status_code=404)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_register_for_tournament_success(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament as Player1
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Register Player2 for the tournament
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        response = self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player2Alias")
        self.assertEqual(response.status_code, 204)
        
        # Verify participant was created
        tournament = Tournament.objects.get(id=tournament_id)
        self.assertEqual(tournament.participants.count(), 2)  # Creator + new participant
        
        participant = tournament.participants.get(alias="Player2Alias")
        self.assertEqual(participant.profile, self.user2.profile)
        self.assertEqual(participant.alias, "Player2Alias")

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.close_tournament_invitations")
    def test_register_for_tournament_becomes_full(self, mock_close_invitations, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament as Player1
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(4),  # 4 players required
        )
        tournament_id = create_response.json()["id"]
        
        # Register 4 players (including creator makes it full)
        users = [self.user2, self.user3, self.user4]
        for i, user in enumerate(users):
            self.client.post(
                "/api/login",
                content_type="application/json",
                data={"username": user.username, "password": "TestPassword123"},
            )
            response = self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player{i+2}Alias")
            self.assertEqual(response.status_code, 204)
        
        # Verify tournament status changed to ongoing
        tournament = Tournament.objects.get(id=tournament_id)
        self.assertEqual(tournament.status, Tournament.ONGOING)
        self.assertEqual(tournament.participants.count(), 4)  # Creator + 3 participants = 4 total
        
        # Verify close invitations was called
        mock_close_invitations.assert_called_once()

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_register_for_tournament_already_full(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament and manually set it as full
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(4),
        )
        tournament_id = create_response.json()["id"]
        tournament = Tournament.objects.get(id=tournament_id)
        
        # Add participants to make it full
        for user in [self.user2, self.user3, self.user4]:
            Participant.objects.create(
                tournament=tournament,
                profile=user.profile,
                alias=f"{user.username}Alias"
            )
        
        # Try to register one more player
        response = self.client.post(f"/api/tournaments/{tournament_id}/register?alias=ExtraPlayer")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "You can't be a participant if you are already in a game", status_code=403)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_register_for_tournament_not_pending(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament and set it to ongoing
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        tournament = Tournament.objects.get(id=tournament_id)
        tournament.status = Tournament.ONGOING
        tournament.save()
        
        # Try to register for ongoing tournament
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        response = self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player2Alias")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "Tournament is not open", status_code=403)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_unregister_from_tournament_while_logged_out(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Logout and try to unregister
        self.client.delete("/api/logout")
        response = self.client.delete(f"/api/tournaments/{tournament_id}/unregister")
        self.assertEqual(response.status_code, 401)

    def test_unregister_from_tournament_nonexistent(self):
        nonexistent_id = uuid4()
        response = self.client.delete(f"/api/tournaments/{nonexistent_id}/unregister")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Tournament not found", status_code=404)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_unregister_from_tournament_not_participant(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Try to unregister without being registered
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        response = self.client.delete(f"/api/tournaments/{tournament_id}/unregister")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "Participant does not exists in this tournament", status_code=403)

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_unregister_from_tournament_success(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament and register a player
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Register Player2
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player2Alias")
        
        # Unregister Player2
        response = self.client.delete(f"/api/tournaments/{tournament_id}/unregister")
        self.assertEqual(response.status_code, 204)
        
        # Verify participant was removed
        tournament = Tournament.objects.get(id=tournament_id)
        self.assertEqual(tournament.participants.count(), 1)  # Creator remains

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.close_tournament_invitations")
    def test_unregister_from_tournament_becomes_empty(self, mock_close_invitations, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament and register a player
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Register Player2 (only participant)
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player2Alias")
        
        # Unregister Player2 (making tournament empty)
        response = self.client.delete(f"/api/tournaments/{tournament_id}/unregister")
        self.assertEqual(response.status_code, 204)
        
        # Verify tournament remains pending (creator still participating)
        tournament = Tournament.objects.get(id=tournament_id)
        self.assertEqual(tournament.status, Tournament.PENDING)
        self.assertEqual(tournament.participants.count(), 1)  # Only creator remains
        
        # Note: close_tournament_invitations not called since tournament wasn't cancelled

    @patch("tournaments.router.endpoints.tournaments.async_to_sync")
    @patch("tournaments.router.endpoints.tournaments.TournamentEvent.send_tournament_notification")
    def test_unregister_from_tournament_not_pending(self, mock_notification, mock_async_to_sync):
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        # Create a tournament, register a player, then set to ongoing
        create_response = self.client.post(
            "/api/tournaments",
            content_type="application/json",
            data=self._get_tournament_creation_data(),
        )
        tournament_id = create_response.json()["id"]
        
        # Register Player2
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "Player2", "password": "TestPassword123"},
        )
        self.client.post(f"/api/tournaments/{tournament_id}/register?alias=Player2Alias")
        
        # Set tournament to ongoing
        tournament = Tournament.objects.get(id=tournament_id)
        tournament.status = Tournament.ONGOING
        tournament.save()
        
        # Try to unregister from ongoing tournament
        response = self.client.delete(f"/api/tournaments/{tournament_id}/unregister")
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, "Cannot unregister from non-open tournament", status_code=403)
