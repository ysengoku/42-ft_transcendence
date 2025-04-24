import logging

from django.core.management.base import BaseCommand

from users.models import Profile

logger = logging.getLogger("server")

class Command(BaseCommand):
    help = "Reset all user connection counters to 0"

    def handle(self, *args, **options):
        try:
            # Reset all connection counters to 0
            Profile.objects.all().update(nb_active_connexions=0, is_online=False)
            logger.info("Successfully reset all connection counters to 0")
        except Exception as e:
            logger.error(f"Error resetting connection counters: {e}")
