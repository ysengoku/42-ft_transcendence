from django.core.management.base import BaseCommand
from users.models import Match, Profile


class Command(BaseCommand):
    help = 'Creates application data'

    def handle(self, **kwargs):
        p1 = Profile.objects.get(user__username="Celia")
        p2 = Profile.objects.get(user__username="Yuko")
        Match.objects.resolve(p1, p2, 3, 2)
