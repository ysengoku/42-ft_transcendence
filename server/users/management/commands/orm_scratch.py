from django.core.management.base import BaseCommand

from chat.models import Notification
from users.models import Profile


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        u1 = Profile.objects.for_username("celiastral").first()
        u2 = Profile.objects.for_username("emuminov").first()

        Notification.objects.action_new_friend(receiver=u1, sender=u2)
