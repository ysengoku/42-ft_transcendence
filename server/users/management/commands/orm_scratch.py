from django.core.management.base import BaseCommand
from django.db.models import Count

from users.jwt import create_jwt, verify_jwt
from users.models import Profile, User


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        user1 = Profile.objects.get(user__username="Pedro1")
        user1.friends.add(user1)
        print(user1.friends.all())
