from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from users.api.common import get_user_by_slug_id_or_404
from users.schemas import (
    Message,
    ProfileMinimalSchema,
    SlugIdSchema,
)

friends_router = Router()


@friends_router.get("{slug_id}/friends", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_friends(request: HttpRequest, slug_id: str):
    """
    Gets friends of specific user.
    Friends who are online will be shown first.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{slug_id}/friends?limit=10&offset=0` will get 10 friends from the very first one.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile.friends.order_by("-is_online").all()


# TODO: add auth
@friends_router.post("{slug_id}/friends", response={201: ProfileMinimalSchema, frozenset({404, 422}): Message})
def add_friend(request: HttpRequest, slug_id: str, user_to_add: SlugIdSchema):
    """
    Adds user as a friend.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    friend = get_user_by_slug_id_or_404(user_to_add.slug_id)

    err_msg = user.profile.add_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, friend.profile


# TODO: add auth
@friends_router.delete(
    "{slug_id}/friends/{friend_to_remove}", response={204: None, frozenset({404, 422}): Message}
)
def remove_from_friends(request: HttpRequest, slug_id: str, friend_to_remove: str):
    """
    Deletes user from a friendlist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    friend = get_user_by_slug_id_or_404(friend_to_remove)

    err_msg = user.profile.remove_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None
