from django.http import HttpRequest
from ninja import Router
from ninja.pagination import paginate

from chat.models import Notification
from chat.schemas import NotificationSchema
from common.schemas import MessageSchema

notifications_router = Router()


@notifications_router.get("", response={200: list[NotificationSchema], frozenset({401}): MessageSchema})
@paginate
def get_notifications(request: HttpRequest, is_read: bool = False):
    """
    Gets notifications of the user who is currently logged in.
    Paginated by the `limit` and `offset` settings.
    For example, `/notifications?&limit=10&offset=0` will get 10 notifications from the very first one.
    You can filter items by `is_read` parameter. False by default.
    """
    return Notification.objects.filter(receiver=request.auth.profile.id, is_read=is_read)
