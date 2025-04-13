from django.http import HttpRequest
from ninja import Router
from ninja.pagination import paginate

from common.routers import get_profile_queryset_by_username_or_404
from common.schemas import MessageSchema
from pong.models import Match
from pong.schemas import DayEloChangeSchema

game_stats_router = Router()


@game_stats_router.get(
    "{username}",
    response={200: list[DayEloChangeSchema], frozenset({401, 404}): MessageSchema},
)
@paginate
def get_game_stats(request: HttpRequest, username: str):
    """
    Gets game statistics for a specific user in the form of overall elo gained across last days.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/game_stats?limit=7&offset=0` will get 7 elo points.
    """
    user_profile = get_profile_queryset_by_username_or_404(username).first()
    return Match.objects.get_elo_points_by_day(user_profile)
