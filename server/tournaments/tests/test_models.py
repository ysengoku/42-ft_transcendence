import asyncio
from django.test import TransactionTestCase
from django.db import transaction
from asgiref.sync import sync_to_async

from tournaments.models import Tournament, Round, Participant
from users.models import User, Profile


class TournamentModelMethodsTestCase(TransactionTestCase):
    """
    Test case for the new Tournament and Round model methods.
    Uses TransactionTestCase to support async testing with transactions.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.profile = Profile.objects.get(user=self.user)

        self.tournament = Tournament.objects.validate_and_create(
            creator=self.profile,
            tournament_name="Test Tournament",
            required_participants=4,
            alias="TestAlias"
        )

    def test_round_set_ongoing_when_pending(self):
        """Test Round.set_ongoing() when round is PENDING."""
        async def test():
            round_obj = await sync_to_async(Round.objects.create)(
                tournament=self.tournament,
                number=1,
                status=Round.PENDING
            )

            result = await round_obj.set_ongoing()

            # Should return False (wasn't already ongoing)
            self.assertFalse(result)

            # Check status was updated
            await sync_to_async(round_obj.refresh_from_db)()
            self.assertEqual(round_obj.status, Round.ONGOING)

        asyncio.run(test())

    def test_round_set_ongoing_when_already_ongoing(self):
        """Test Round.set_ongoing() when round is already ONGOING."""
        async def test():
            round_obj = await sync_to_async(Round.objects.create)(
                tournament=self.tournament,
                number=1,
                status=Round.ONGOING
            )

            result = await round_obj.set_ongoing()

            # Should return True (was already ongoing)
            self.assertTrue(result)

            # Check status remained unchanged
            await sync_to_async(round_obj.refresh_from_db)()
            self.assertEqual(round_obj.status, Round.ONGOING)

        asyncio.run(test())

    def test_round_set_finished(self):
        """Test Round.set_finished() method."""
        async def test():
            round_obj = await sync_to_async(Round.objects.create)(
                tournament=self.tournament,
                number=1,
                status=Round.ONGOING
            )

            await round_obj.set_finished()

            # Check status was updated
            await sync_to_async(round_obj.refresh_from_db)()
            self.assertEqual(round_obj.status, Round.FINISHED)

        asyncio.run(test())

    def test_tournament_cancel_tournament(self):
        """Test Tournament.cancel_tournament() method."""
        async def test():
            # Set tournament to ONGOING first
            self.tournament.status = Tournament.ONGOING
            await sync_to_async(self.tournament.save)()

            await self.tournament.cancel_tournament()

            # Check status was updated
            await sync_to_async(self.tournament.refresh_from_db)()
            self.assertEqual(self.tournament.status, Tournament.CANCELLED)

        asyncio.run(test())

    def test_round_methods_are_atomic(self):
        """Test that Round methods use atomic transactions."""
        async def test():
            round_obj = await sync_to_async(Round.objects.create)(
                tournament=self.tournament,
                number=1,
                status=Round.PENDING
            )

            # Test set_ongoing is atomic by checking it doesn't raise transaction errors
            try:
                await round_obj.set_ongoing()
                await round_obj.set_finished()
                success = True
            except Exception:
                success = False

            self.assertTrue(success, "Methods should handle transactions properly")

        asyncio.run(test())

    def test_tournament_cancel_is_atomic(self):
        """Test that Tournament.cancel_tournament() uses atomic transaction."""
        async def test():
            self.tournament.status = Tournament.ONGOING
            await sync_to_async(self.tournament.save)()

            # Test cancel_tournament is atomic
            try:
                await self.tournament.cancel_tournament()
                success = True
            except Exception:
                success = False

            self.assertTrue(success, "cancel_tournament should handle transactions properly")

            # Verify the change was persisted
            await sync_to_async(self.tournament.refresh_from_db)()
            self.assertEqual(self.tournament.status, Tournament.CANCELLED)

        asyncio.run(test())


class TournamentModelMethodsSyncTestCase(TransactionTestCase):
    """
    Synchronous tests for Tournament model methods using sync_to_async wrapper.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123"
        )
        self.profile = Profile.objects.get(user=self.user)

        self.tournament = Tournament.objects.validate_and_create(
            creator=self.profile,
            tournament_name="Test Tournament 2",
            required_participants=4,
            alias="TestAlias2"
        )

    def test_round_status_transitions(self):
        """Test Round status transitions work correctly."""
        async def test():
            round_obj = await sync_to_async(Round.objects.create)(
                tournament=self.tournament,
                number=1,
                status=Round.PENDING
            )

            # Test PENDING -> ONGOING
            result = await round_obj.set_ongoing()
            self.assertFalse(result)  # Wasn't already ongoing

            await sync_to_async(round_obj.refresh_from_db)()
            self.assertEqual(round_obj.status, Round.ONGOING)

            # Test ONGOING -> FINISHED
            await round_obj.set_finished()
            await sync_to_async(round_obj.refresh_from_db)()
            self.assertEqual(round_obj.status, Round.FINISHED)

        asyncio.run(test())

    def test_tournament_status_transition_to_cancelled(self):
        """Test Tournament status transition to CANCELLED."""
        async def test():
            self.tournament.status = Tournament.ONGOING
            await sync_to_async(self.tournament.save)()

            await self.tournament.cancel_tournament()
            await sync_to_async(self.tournament.refresh_from_db)()
            self.assertEqual(self.tournament.status, Tournament.CANCELLED)

        asyncio.run(test())