import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from chat.models import Notification
from chat.schemas import NotificationSchema
from common.routers import get_profile_queryset_by_username_or_404
from common.schemas import MessageSchema

notifications_router = Router()


@notifications_router.get("", response={200: list[NotificationSchema], frozenset({401}): MessageSchema})
@paginate
def get_notifications(request: HttpRequest):
    """
    Gets notifications.
    Paginated by the `limit` and `offset` settings.
    For example, `/notifications?&limit=10&offset=0` will get 10 notifications from the very first one.
    """
