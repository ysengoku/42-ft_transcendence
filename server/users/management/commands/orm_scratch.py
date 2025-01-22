from django.core.management.base import BaseCommand
from users.models import Match, Profile
from django.db.models import Q, Sum, When, Case


class Command(BaseCommand):
    help = 'Creates application data'

    def handle(self, **kwargs):
        p = Profile.objects.get(user__username="Celia")
        scored_balls_stats = p.matches.aggregate(
            scored_balls=Sum(Case(
                When(loser=p, then="losers_score"),
                When(winner=p, then="winners_score"),
            )),
            # lscore=Sum('losers_score', filter=Q(loser=self)),
            # wscore=Sum('winners_score', filter=Q(winner=self)),
        )
        print(scored_balls_stats)
