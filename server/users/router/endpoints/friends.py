from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from chat.models import Notification
from common.routers import allow_only_for_self, get_user_queryset_by_username_or_404
from common.schemas import MessageSchema
from users.schemas import (
    ProfileMinimalSchema,
    UsernameSchema,
)

friends_router = Router()


@friends_router.get(
    "{username}/friends",
    response={200: list[ProfileMinimalSchema], frozenset({401, 403, 404}): MessageSchema},
)
@paginate
def get_friends(request: HttpRequest, username: str):
    """
    Gets friends of specific user.
    Friends who are online will be shown first.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/friends?limit=10&offset=0` will get 10 friends from the very first one.
    """
    user = allow_only_for_self(request, username)
    return user.profile.friends.order_by("-is_online").all()


@friends_router.post(
    "{username}/friends",
    response={201: ProfileMinimalSchema, frozenset({401, 403, 404, 422}): MessageSchema},
)
def add_friend(request: HttpRequest, username: str, user_to_add: UsernameSchema):
    """
    Adds user as a friend.
    """
    user = allow_only_for_self(request, username)

    friend = get_user_queryset_by_username_or_404(user_to_add.username).first()

    err_msg = user.profile.add_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)

    # Create notification for the new friend
    notification = Notification.objects.action_new_friend(
        receiver=friend.profile,
        sender=user.profile,
    )

    # Send notification via websocket
    channel_layer = get_channel_layer()
    notification_data = {
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.profile.avatar,
        "date": notification.data["date"].isoformat(),  # Convert datetime to ISO string
    }

    async_to_sync(channel_layer.group_send)(
        f"user_{friend.id}",
        {
            "type": "user_status",
            "action": "new_friend",
            "data": notification_data,
        },
    )

    return 201, friend.profile


@friends_router.delete(
    "{username}/friends/{friend_to_remove}",
    response={204: None, frozenset({401, 403, 404, 422}): MessageSchema},
)
def remove_from_friends(request: HttpRequest, username: str, friend_to_remove: str):
    """
    Deletes user from a friendlist.
    """
    user = allow_only_for_self(request, username)

    friend = get_user_queryset_by_username_or_404(friend_to_remove).first()

    err_msg = user.profile.remove_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None
