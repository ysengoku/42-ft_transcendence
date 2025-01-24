from django.core.management.base import BaseCommand
from django.db.models import Count

from users.models import Profile


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        p = Profile.objects.filter(user__username="celiastral")
        p.annotate(
            winss=Count("won_matches", distinct=True),
            losess=Count("lost_matches", distinct=True),
        )
