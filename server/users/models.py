from django.db import models
from django.contrib.auth.models import AbstractUser
from django.templatetags.static import static
from django.db.models import F, When, Case


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
