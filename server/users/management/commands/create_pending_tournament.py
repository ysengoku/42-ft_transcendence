from django.core.management.base import BaseCommand

from .populate_db import create_pending_tournament


class Command(BaseCommand):
    help = "Create pending tournament if the database had been populated"

    def handle(self, **kwargs) -> None:  # noqa: PLR0915
        create_pending_tournament()
