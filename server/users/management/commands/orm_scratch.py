from django.core.management.base import BaseCommand
from django.db.models import Count

from users.jwt import create_jwt, verify_jwt
from users.models import Profile, User


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        u1 = User.objects.create_user(
            username="Pedro", password="123", email="pedro1@gmail.com", connection_type=User.REGULAR
        )
        print(u1.connection_type)
        u2 = User.objects.create_user(
            username="Pedro", password="123", email="pedro2@gmail.com", connection_type=User.FT
        )
