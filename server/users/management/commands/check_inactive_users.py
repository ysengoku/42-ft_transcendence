import logging

from django.core.management.base import BaseCommand

from users.service import check_inactive_users

logger = logging.getLogger("server")


class Command(BaseCommand):
    help = "Checks if there are inactive users every 5 minutes"

    def handle(self, *args, **options):
        check_inactive_users()
        logger.info("Manual check of inactive users finished.")
