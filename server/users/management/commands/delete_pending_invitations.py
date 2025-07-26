import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from chat.models import GameInvitation

logger = logging.getLogger("server")


class Command(BaseCommand):
    help = "Delete all pending invitations"

    def handle(self, *args, **options):
        invitations = GameInvitation.objects.filter(
            status=GameInvitation.PENDING,
        )
        if not invitations.exists():
            logger.info("No pending invitations in the database.")
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.CANCELLED
                invitation.save()
                invitation.sync_notification_status()
                count += 1
            logger.info("Cancelled %d pending invitations", count)
