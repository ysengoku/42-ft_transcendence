import logging

from django.core.management.base import BaseCommand
from django.db import DatabaseError, connections

from users.models import Profile

logger = logging.getLogger("server")


class Command(BaseCommand):
    help = "Reset all user connection counters to 0"

    def handle(self, *args, **options):
        table_name = Profile._meta.db_table
        connection = connections["default"]

        if table_name in connection.introspection.table_names():
            try:
                # Reset all connection counters to 0
                Profile.objects.all().update(nb_active_connexions=0, is_online=False)
                logger.info("Successfully reset all connection counters to 0")
            except DatabaseError as e:
                logger.error("Error resetting connection counters: %s", e)
        else:
            logger.info(
                "Table '%s' does not exist. No need to reset connection counters.",
                table_name,
            )
