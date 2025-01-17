from django.db.models import F, Q, Sum, Count, When, Case
from ninja import ModelSchema, Schema
from datetime import datetime
from .models import User, Profile, Match
from typing import List


class ErrorSchema(Schema):
    message: str


class ProfilePreviewSchema(ModelSchema):
    """
    Schema for displaying brief preview of the user profile for displaying in
    context where it needs to be short (like match history).
    """
    username: str
    avatar: str

    class Meta:
        model = Profile
        fields = ['elo']

    @staticmethod
    def resolve_username(obj):
        return obj.user.username

    @staticmethod
    def resolve_avatar(obj):
        return obj.avatar


class EloDataPointSchema(Schema):
    date: datetime
    elo_change_signed: int
    elo_result: int


class ProfileFullSchema(ModelSchema):
    """
    Schema for displaying all the data for the user profile page.
    """
    username: str
    avatar: str
    date_joined: datetime
    winrate: int
    worst_enemy: ProfilePreviewSchema | None = None
    best_enemy: ProfilePreviewSchema | None = None
    scored_balls: int
    elo_history: List[EloDataPointSchema]

    class Meta:
        model = Profile
        fields = ['is_online', 'elo', 'friends']

    @staticmethod
    def resolve_username(obj: Profile):
        return obj.user.username

    @staticmethod
    def resolve_avatar(obj: Profile):
        return obj.avatar

    @staticmethod
    def resolve_date_joined(obj: Profile):
        return obj.user.date_joined

    @staticmethod
    def resolve_winrate(obj: Profile):
        wins = obj.won_matches.count()
        loses = obj.lost_matches.count()
        if loses == 0:
            return 100
        return wins / (wins + loses) * 100

    @staticmethod
    def resolve_worst_enemy(obj: Profile):
        if obj.matches.count() == 0:
            return None
        worst_enemy = obj.lost_matches.values('winner') \
            .annotate(losses=Count('winner')) \
            .order_by('-losses') \
            .first()
        if worst_enemy:
            res = Profile.objects.get(user__id=worst_enemy["winner"])
        print(res)
        print(worst_enemy)
        return res

    @staticmethod
    def resolve_best_enemy(obj: Profile):
        if obj.matches.count() == 0:
            return None
        return None

    @staticmethod
    def resolve_scored_balls(obj: Profile):
        scored_when_lost = obj.lost_matches.aggregate(
            scored_when_lost=Sum('loser_score'))['scored_when_lost'] or 0
        scored_when_won = obj.won_matches.aggregate(
            scored_when_won=Sum('winner_score'))['scored_when_won'] or 0
        scored_balls = scored_when_won + scored_when_lost
        return scored_balls

    @staticmethod
    def resolve_elo_history(obj: Profile):
        return obj.get_elo_data_points()


class SignUpSchema(Schema):
    username: str
    email: str
    password: str
    password_repeat: str
