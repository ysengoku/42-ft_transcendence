from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        User.objects.create_user(
            username="Pedro", password="123", email="pedro1@gmail.com", connection_type=User.REGULAR  # noqa: S106
        )
        User.objects.create_user(
            username="Pedro", password="123", email="pedro2@gmail.com", connection_type=User.FT  # noqa: S106
        )
