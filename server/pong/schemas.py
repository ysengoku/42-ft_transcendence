from datetime import date, datetime

from ninja import Field, Schema

from common.schemas import ProfileMinimalSchema
from pong.models import Match
from users.models import Profile


class EloDataPointSchema(Schema):
    """
    Represents a single point of gained/lost elo on a particular day.
    """

    day: date
    daily_elo_change: int = Field(description="How much elo user gained or lost on this day.")
    elo_result: int = Field(description="Resulting elo of the user at the end of the day.")


class ProfileMatchPreviewSchema(Schema):
    """
    Represents a preview of a singular instance of a pong match between the current profile and the opponent.
    """

    date: date
    elo_result: int
    opponent: ProfileMinimalSchema
    is_winner: bool
    game_id: str
    score: str

    @staticmethod
    def resolve_opponent(obj: Match):
        return Profile.objects.get(pk=obj.opponent_pk)

    @staticmethod
    def resolve_date(obj: Match):
        return obj.date.strftime("%Y-%m-%d")

    @staticmethod
    def resolve_game_id(obj: Match):
        return str(obj.pk)

    @staticmethod
    def resolve_score(obj: Match):
        if obj.is_winner:
            return f"{obj.winners_score} - {obj.losers_score}"
        return f"{obj.losers_score} - {obj.winners_score}"

class FullMatchStatsSchema(Schema):
    winner: ProfileMinimalSchema
    loser: ProfileMinimalSchema
    winners_score: int
    losers_score: int
    date: datetime
