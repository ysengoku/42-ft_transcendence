from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from common.routers import allow_only_for_self, get_user_queryset_by_username_or_404
from common.schemas import MessageSchema
from users.schemas import (
    ProfileMinimalSchema,
    UsernameSchema,
)

blocked_users_router = Router()


@blocked_users_router.get(
    "{username}/blocked_users",
    response={200: list[ProfileMinimalSchema], frozenset({401, 403, 404}): MessageSchema},
)
@paginate
def get_blocked_users(request: HttpRequest, username: str):
    """
    Gets blocked users of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/blocked_users?limit=10&offset=0` will get 10 blocked users from the very first one.
    """
    user = allow_only_for_self(request, username)
    return user.profile.blocked_users.all()


@blocked_users_router.post(
    "{username}/blocked_users",
    response={201: ProfileMinimalSchema, frozenset({401, 403, 404, 422}): MessageSchema},
)
def add_to_blocked_users(request: HttpRequest, username: str, user_to_add: UsernameSchema):
    """
    Adds user to the blocklist.
    """
    user = allow_only_for_self(request, username)

    blocked_user = get_user_queryset_by_username_or_404(user_to_add.username).first()

    err_msg = user.profile.block_user(blocked_user.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, blocked_user.profile


@blocked_users_router.delete(
    "{username}/blocked_users/{blocked_user_to_remove}",
    response={204: None, frozenset({401, 403, 404, 422}): MessageSchema},
)
def remove_from_blocked_users(request: HttpRequest, username: str, blocked_user_to_remove: str):
    """
    Deletes user from a blocklist.
    """
    user = allow_only_for_self(request, username)

    blocked_user = get_user_queryset_by_username_or_404(blocked_user_to_remove).first()

    err_msg = user.profile.unblock_user(blocked_user.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None
