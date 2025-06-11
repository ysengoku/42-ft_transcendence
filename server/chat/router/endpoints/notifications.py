from django.db.models import Q
from django.http import HttpRequest
from ninja import Router
from ninja.pagination import paginate

from chat.models import GameInvitation, Notification, TournamentInvitation
from chat.schemas import NotificationSchema
from common.schemas import MessageSchema

notifications_router = Router()


@notifications_router.get("", response={200: list[NotificationSchema], frozenset({401}): MessageSchema})
@paginate
def get_notifications(request: HttpRequest, is_read: str = "all"):
    """
    Gets notifications of the user who is currently logged in.
    Paginated by the `limit` and `offset` settings.
    For example, `/notifications?&limit=10&offset=0` will get 10 notifications from the very first one.
    You can filter items by `is_read` parameter. False by default.
    """
    profile_id = request.auth.profile.id

    if is_read == "all":
        base_qs = Notification.objects.filter(receiver=profile_id)
    else:
        base_qs = Notification.objects.filter(receiver=profile_id, is_read=(is_read != "false"))

    qs = base_qs.filter(
        (
            Q(action=Notification.GAME_INVITE, data__status=GameInvitation.PENDING)
            | ~Q(action=Notification.GAME_INVITE)
        )
        &
        (
            Q(action=Notification.NEW_TOURNAMENT, data__status=TournamentInvitation.OPEN)
            | ~Q(action=Notification.NEW_TOURNAMENT)
        )
    )
    return qs


@notifications_router.post("/mark_all_as_read", response={200: MessageSchema})
def mark_all_notifications_read(request):
    profile = request.auth.profile
    Notification.objects.mark_all_read(profile)
    return 200, {"msg": "All notifications marked as read"}
