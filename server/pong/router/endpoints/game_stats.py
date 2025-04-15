from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from common.routers import get_profile_queryset_by_username_or_404
from common.schemas import MessageSchema
from pong.models import Match
from pong.schemas import EloDataPointSchema, FullMatchStatsSchema, ProfileMatchPreviewSchema

game_stats_router = Router()


@game_stats_router.get(
    "{username}/daily-elo",
    response={200: list[EloDataPointSchema], frozenset({401, 404}): MessageSchema},
)
@paginate
def get_daily_elo_change(request: HttpRequest, username: str):
    """
    Gets daily elo change statistics for a specific user in the form of overall elo gained across last days.
    Paginated by the `limit` and `offset` settings.
    For example, `/{username}/daily-elo?limit=7&offset=0` will get 7 elo points.
    """
    user_profile = get_profile_queryset_by_username_or_404(username).first()
    return Match.objects.get_elo_points_by_day(user_profile)


@game_stats_router.get(
    "{username}/matches",
    response={200: list[ProfileMatchPreviewSchema], frozenset({401, 404}): MessageSchema},
)
@paginate
def get_matches(request: HttpRequest, username: str, order: str = "desc", result: str = "all"):
    """
    Gets match history of a specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/{username}/matches?limit=7&offset=0` will get 7 elo points.
    Uses additional options: `order` and `result`.
    `order` can be `asc` or `decs`. If `asc`, it will give matches starting from the oldest, `desc` starting from the
    newest.
    `result` can be `all`, `lost` or `won`. `all` gives all matches, `loses` gives only lost matches, `wins` gives
    only won matches.
    """
    user_profile = get_profile_queryset_by_username_or_404(username).first()
    qs = Match.objects.get_match_preview(user_profile)
    if order == "asc":
        qs = qs.order_by("date")
    if result == "lost":
        qs = qs.filter(loser=user_profile)
    elif result == "won":
        qs = qs.filter(winner=user_profile)
    return qs


@game_stats_router.get(
    "matches/{game_id}",
    response={200: FullMatchStatsSchema, frozenset({401, 404}): MessageSchema},
)
def get_match(request: HttpRequest, game_id: str):
    """
    Gets full stats of a specific match by its id.
    """
    match = Match.objects.filter(id=game_id).first()
    if not match:
        raise HttpError(404, "Match not found")
    return match
