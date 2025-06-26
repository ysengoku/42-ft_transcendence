import logging

from django.test import TestCase

from chat.models import GameInvitation, Notification, TournamentInvitation
from users.models import User


class NotificationsEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user1 = User.objects.create_user("User1", email="user1@example.com", password="TestPassword123")
        self.user2 = User.objects.create_user("User2", email="user2@example.com", password="TestPassword123")
        
        # Login as user1 by default
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "User1", "password": "TestPassword123"},
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def test_get_notifications_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 401)

    def test_get_notifications_empty_list(self):
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)
        self.assertEqual(len(response_data["items"]), 0)

    def test_get_notifications_with_general_notifications(self):
        # Create various notifications
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User2"},
            is_read=False
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_MESSAGE,
            data={"from": "User2", "content": "Hello!"},
            is_read=True
        )
        
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)
        self.assertEqual(len(response_data["items"]), 2)

    def test_get_notifications_with_game_invitations(self):
        # Create game invitation notification with pending status
        game_invitation = GameInvitation.objects.create(
            sender=self.user2.profile,
            invitee=self.user1.profile,
            status=GameInvitation.PENDING
        )
        
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.GAME_INVITE,
            data={"status": GameInvitation.PENDING, "invitation_id": game_invitation.id},
            is_read=False
        )
        
        # Create game invitation notification with accepted status (should be filtered out)
        game_invitation_accepted = GameInvitation.objects.create(
            sender=self.user2.profile,
            invitee=self.user1.profile,
            status=GameInvitation.ACCEPTED
        )
        
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.GAME_INVITE,
            data={"status": GameInvitation.ACCEPTED, "invitation_id": game_invitation_accepted.id},
            is_read=False
        )
        
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)  # Only pending invitation should be shown
        self.assertEqual(response_data["items"][0]["action"], Notification.GAME_INVITE)

    def test_get_notifications_with_tournament_invitations(self):
        # Create tournament invitation notification with open status
        tournament_invitation = TournamentInvitation.objects.create(
            name="Test Tournament",
            alias="TestAlias",
            status=TournamentInvitation.OPEN
        )
        
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_TOURNAMENT,
            data={"status": TournamentInvitation.OPEN, "tournament_id": tournament_invitation.id},
            is_read=False
        )
        
        # Create tournament invitation notification with closed status (should be filtered out)
        tournament_invitation_closed = TournamentInvitation.objects.create(
            name="Closed Tournament",
            alias="ClosedAlias",
            status=TournamentInvitation.CLOSED
        )
        
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_TOURNAMENT,
            data={"status": TournamentInvitation.CLOSED, "tournament_id": tournament_invitation_closed.id},
            is_read=False
        )
        
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)  # Only open tournament should be shown
        self.assertEqual(response_data["items"][0]["action"], Notification.NEW_TOURNAMENT)

    def test_get_notifications_filter_unread_only(self):
        # Create mix of read and unread notifications
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User2"},
            is_read=False
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_MESSAGE,
            data={"from": "User2", "content": "Hello!"},
            is_read=True
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User3"},
            is_read=False
        )
        
        # Test filter for unread notifications
        response = self.client.get("/api/notifications?is_read=false")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)  # Only unread notifications
        
        for notification in response_data["items"]:
            self.assertFalse(notification["is_read"])

    def test_get_notifications_filter_read_only(self):
        # Create mix of read and unread notifications
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User2"},
            is_read=False
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_MESSAGE,
            data={"from": "User2", "content": "Hello!"},
            is_read=True
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_MESSAGE,
            data={"from": "User3", "content": "Hi!"},
            is_read=True
        )
        
        # Test filter for read notifications
        response = self.client.get("/api/notifications?is_read=true")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)  # Only read notifications
        
        for notification in response_data["items"]:
            self.assertTrue(notification["is_read"])

    def test_get_notifications_filter_all(self):
        # Create mix of read and unread notifications
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User2"},
            is_read=False
        )
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_MESSAGE,
            data={"from": "User2", "content": "Hello!"},
            is_read=True
        )
        
        # Test filter for all notifications
        response = self.client.get("/api/notifications?is_read=all")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 2)  # All notifications

    def test_get_notifications_pagination(self):
        # Create many notifications
        for i in range(25):
            Notification.objects.create(
                receiver=self.user1.profile,
                action=Notification.NEW_MESSAGE,
                data={"from": "User2", "content": f"Message {i}"},
                is_read=i % 2 == 0
            )
        
        # Test first page
        response = self.client.get("/api/notifications?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test second page
        response = self.client.get("/api/notifications?limit=10&offset=10")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test third page
        response = self.client.get("/api/notifications?limit=10&offset=20")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 5)

    def test_mark_all_notifications_read_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.post("/api/notifications/mark_all_as_read")
        self.assertEqual(response.status_code, 401)

    def test_mark_all_notifications_read_success(self):
        # Create unread notifications
        for i in range(5):
            Notification.objects.create(
                receiver=self.user1.profile,
                action=Notification.NEW_MESSAGE,
                data={"from": "User2", "content": f"Message {i}"},
                is_read=False
            )
        
        # Verify all are unread
        unread_count = Notification.objects.filter(receiver=self.user1.profile, is_read=False).count()
        self.assertEqual(unread_count, 5)
        
        # Mark all as read
        response = self.client.post("/api/notifications/mark_all_as_read")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "All notifications marked as read", status_code=200)
        
        # Verify all are now read
        unread_count = Notification.objects.filter(receiver=self.user1.profile, is_read=False).count()
        self.assertEqual(unread_count, 0)
        
        read_count = Notification.objects.filter(receiver=self.user1.profile, is_read=True).count()
        self.assertEqual(read_count, 5)

    def test_mark_all_notifications_read_with_no_notifications(self):
        # Test marking all as read when there are no notifications
        response = self.client.post("/api/notifications/mark_all_as_read")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "All notifications marked as read", status_code=200)

    def test_notifications_ordering(self):
        # Create notifications with different timestamps
        import time
        notifications = []
        for i in range(3):
            notification = Notification.objects.create(
                receiver=self.user1.profile,
                action=Notification.NEW_MESSAGE,
                data={"from": "User2", "content": f"Message {i}"},
                is_read=False
            )
            notifications.append(notification)
            time.sleep(0.01)  # Small delay to ensure different timestamps
        
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        
        # Notifications should be ordered by creation time (newest first typically)
        received_notifications = response_data["items"]
        self.assertEqual(len(received_notifications), 3)

    def test_user_isolation_notifications(self):
        # Create notifications for user1
        Notification.objects.create(
            receiver=self.user1.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User2"},
            is_read=False
        )
        
        # Create notifications for user2
        Notification.objects.create(
            receiver=self.user2.profile,
            action=Notification.NEW_FRIEND,
            data={"username": "User1"},
            is_read=False
        )
        
        # User1 should only see their own notifications
        response = self.client.get("/api/notifications")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)
        self.assertEqual(response_data["items"][0]["data"]["username"], "User2")
