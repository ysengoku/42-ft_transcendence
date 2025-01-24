from django.core.management.base import BaseCommand
from users.models import Match, Profile
from django.db.models import Q, Sum, When, Case, Count


class Command(BaseCommand):
    help = 'Creates application data'

    def handle(self, **kwargs):
        p = Profile.objects.filter(user__username="celiastral")
        res = p.annotate(
            winss=Count('won_matches', distinct=True),
            losess=Count('lost_matches', distinct=True)
        )
