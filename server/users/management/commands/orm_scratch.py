from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        pass
