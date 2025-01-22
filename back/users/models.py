from django.db import models, connection
from django.contrib.auth.models import AbstractUser
from django.db.models import F, When, Case, Sum, Count, Value, IntegerField, Q
from .stats_calc import calculate_winrate, calculate_elo_change


class User(AbstractUser):
    pass


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(
        upload_to="avatars/", null=True, blank=True
    )
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField('self')
    is_online = models.BooleanField(default=True)

    @property
    def avatar(self):
        if self.profile_picture:
            return self.profile_picture.url
        return "/media/avatars/default_avatar.png"

    @property
    def matches(self):
        return self.won_matches.all() | self.lost_matches.all()

    @property
    def wins(self):
        return self.won_matches.count()

    @property
    def loses(self):
        return self.lost_matches.count()

    @property
    def winrate(self):
        return calculate_winrate(self.wins, self.loses)

    @property
    def scored_balls(self):
        scored_balls_stats = self.matches.aggregate(
            lscore=Sum('losers_score', filter=Q(loser=self)),
            wscore=Sum('winners_score', filter=Q(winner=self)),
        )
        scored_balls = (scored_balls_stats["lscore"] or 0) + (scored_balls_stats["wscore"] or 0)
        return scored_balls

    @property
    def best_enemy(self):
        best_enemy = self.won_matches.values('loser') \
            .annotate(wins=Count('loser')) \
            .order_by('-wins') \
            .first()
        if not best_enemy or not best_enemy.get('loser', None):
            return None
        res = Profile.objects.get(id=best_enemy["loser"])
        return res

    @property
    def worst_enemy(self):
        worst_enemy = self.lost_matches.values('winner') \
            .annotate(losses=Count('winner')) \
            .order_by('-losses') \
            .first()
        if not worst_enemy or not worst_enemy.get('winner', None):
            return None
        res = Profile.objects.get(id=worst_enemy["winner"])
        return res

    def get_stats_against_player(self, profile):
        res = self.matches.aggregate(
            wins=Count("pk", filter=Q(winner=self) & Q(loser=profile)),
            loses=Count("pk", filter=Q(winner=profile) & Q(loser=self))
        )
        return {
            'username': profile.user.username,
            'avatar': profile.avatar,
            'elo': profile.elo,
            'wins': res["wins"],
            'loses': res["loses"],
            'winrate': calculate_winrate(res["wins"], res["loses"]),
        }

    def annotate_elo_data_points(self):
        return self.matches.annotate(
            elo_change_signed=Case(
                When(winner=self, then=F('elo_change')),
                When(loser=self, then=-F('elo_change'))
            ),
            elo_result=Case(
                When(winner=self, then=F('winners_elo')),
                When(loser=self, then=F('losers_elo'))
            ),
        )

    def __str__(self):
        return self.user.username


class MatchManager(models.Manager):
    MINUMUM_ELO = 100
    K_FACTOR = 32
    WIN = 1
    DRAW = 0.5
    LOSS = 0

    def resolve(self, winner: Profile, loser: Profile, winners_score: int, losers_score: int):
        """
        Resolves all elo calculations, updates profiles of players,
        creates a new match record and saves everything into the database.
        """
        elo_change = calculate_elo_change(winner.elo, loser.elo, MatchManager.WIN, MatchManager.K_FACTOR)
        if (loser.elo - elo_change) < MatchManager.MINUMUM_ELO:
            elo_change = loser.elo - MatchManager.MINUMUM_ELO
        winner.elo += elo_change
        loser.elo -= elo_change
        resolved_match = Match(
            winner=winner, loser=loser, winners_score=winners_score, losers_score=losers_score, elo_change=elo_change, winners_elo=winner.elo, losers_elo=loser.elo)
        resolved_match.save()
        winner.save()
        loser.save()
        return resolved_match


class Match(models.Model):
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True)
    winners_score = models.IntegerField()
    losers_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField(default=1000)
    losers_elo = models.IntegerField(default=1000)
    date = models.DateTimeField(auto_now_add=True)

    objects = MatchManager()

    def __str__(self):
        return f'{self.winner.user.username} - {self.loser.user.username}'

    class Meta:
        verbose_name_plural = "matches"
