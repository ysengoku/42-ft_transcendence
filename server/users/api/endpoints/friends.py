from django.http import HttpRequest
from ninja import Router
from ninja.errors import AuthenticationError, HttpError
from ninja.pagination import paginate

from users.api.common import get_user_by_username_or_404
from users.schemas import (
    Message,
    ProfileMinimalSchema,
    UsernameSchema,
)

friends_router = Router()


@friends_router.get("{username}/friends", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_friends(request: HttpRequest, username: str):
    """
    Gets friends of specific user.
    Friends who are online will be shown first.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/friends?limit=10&offset=0` will get 10 friends from the very first one.
    """
    user = request.auth

    if user.username != username:
        raise AuthenticationError
    return user.profile.friends.order_by("-is_online").all()


@friends_router.post("{username}/friends", response={201: ProfileMinimalSchema, frozenset({404, 422}): Message})
def add_friend(request: HttpRequest, username: str, user_to_add: UsernameSchema):
    """
    Adds user as a friend.
    """
    user = request.auth

    if user.username != username:
        raise AuthenticationError

    friend = get_user_by_username_or_404(user_to_add.username)

    err_msg = user.profile.add_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, friend.profile


# TODO: add auth
@friends_router.delete("{username}/friends/{friend_to_remove}", response={204: None, frozenset({404, 422}): Message})
def remove_from_friends(request: HttpRequest, username: str, friend_to_remove: str):
    """
    Deletes user from a friendlist.
    """
    user = request.auth

    if user.username != username:
        raise AuthenticationError

    friend = get_user_by_username_or_404(friend_to_remove)

    err_msg = user.profile.remove_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None
