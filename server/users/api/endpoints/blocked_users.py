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

blocked_users_router = Router()


@blocked_users_router.get("{slug_id}/blocked_users", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_blocked_users(request: HttpRequest, slug_id: str):
    """
    Gets blocked users of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{slug_id}/blocked_users?limit=10&offset=0` will get 10 blocked users from the very first one.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile.blocked_users.all()


# TODO: add auth
@blocked_users_router.post(
    "{slug_id}/blocked_users", response={201: ProfileMinimalSchema, frozenset({404, 422}): Message}
)
def add_to_blocked_users(request: HttpRequest, slug_id: str, user_to_add: SlugIdSchema):
    """
    Adds user to the blocklist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    blocked_user = get_user_by_slug_id_or_404(user_to_add.slug_id)

    err_msg = user.profile.block_user(blocked_user.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, blocked_user.profile


# TODO: add auth
@blocked_users_router.delete(
    "{slug_id}/blocked_users/{blocked_user_to_remove}",
    response={204: None, frozenset({404, 422}): Message},
)
def remove_from_blocked_users(request: HttpRequest, slug_id: str, blocked_user_to_remove: str):
    """
    Deletes user from a blocklist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    blocked_user = get_user_by_slug_id_or_404(blocked_user_to_remove)

    err_msg = user.profile.unblock_user(blocked_user.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None
