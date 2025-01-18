from django.db import models
from django.contrib.auth.models import AbstractUser
from django.templatetags.static import static
from django.db.models import F, When, Case, Sum, Count


class User(AbstractUser):
    pass


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(
        upload_to="avatars/", null=True, blank=True
    )
    elo = models.IntegerField(default=1000)
    friends = models.ManyToManyField(User, related_name='friends', blank=True)
    is_online = models.BooleanField(default=True)

    @property
    def avatar(self):
        if self.profile_picture:
            return self.profile_picture.url
        return static("images/default.svg")

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
        wins = self.wins
        loses = self.loses
        total = wins + loses
        if total == 0:
            return 100
        return wins / (total) * 100

    @property
    def scored_balls(self):
        scored_when_lost = self.lost_matches.aggregate(
                scored_when_lost=Sum('loser_score'))['scored_when_lost'] or 0
        scored_when_won = self.won_matches.aggregate(
                scored_when_won=Sum('winner_score'))['scored_when_won'] or 0
        scored_balls = scored_when_won + scored_when_lost
        return scored_balls

    @property
    def best_enemy(self):
        best_enemy = self.won_matches.values('loser') \
            .annotate(wins=Count('loser')) \
            .order_by('-wins')
        best_enemy = best_enemy.first()
        if not best_enemy:
            return None
        res = Profile.objects.get(id=best_enemy["loser"])
        return res

    @property
    def worst_enemy(self):
        worst_enemy = self.lost_matches.values('winner') \
            .annotate(losses=Count('winner')) \
            .order_by('-losses')
        worst_enemy = worst_enemy.first()
        if not worst_enemy:
            return None
        res = Profile.objects.get(id=worst_enemy["winner"])
        return res

    def get_elo_data_points(self):
        elo_data_points = self.matches.annotate(
            elo_change_signed=Case(
                When(winner=self, then=F('elo_change')),
                When(loser=self, then=-F('elo_change')),
            ),
            elo_result=Case(
                When(winner=self, then=F('winners_elo')),
                When(loser=self, then=F('losers_elo')),
            ),
        ).values('date', 'elo_change_signed', 'elo_result')
        return elo_data_points

    def __str__(self):
        return self.user.username


class Match(models.Model):
    winner = models.ForeignKey(Profile, related_name="won_matches", on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey(Profile, related_name="lost_matches", on_delete=models.SET_NULL, null=True)
    winner_score = models.IntegerField()
    loser_score = models.IntegerField()
    elo_change = models.IntegerField()
    winners_elo = models.IntegerField(default=1000)
    losers_elo = models.IntegerField(default=1000)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.winner.user.username} - {self.loser.user.username}'
