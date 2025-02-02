from django.core.exceptions import PermissionDenied, RequestDataTooBig
from django.db.models import Q
from django.http import HttpRequest
from ninja import File, Form, Router
from ninja.errors import AuthenticationError, HttpError
from ninja.files import UploadedFile
from ninja.pagination import paginate

from users.api.common import get_profile_queryset_by_username_or_404
from users.models import Profile
from users.schemas import (
    Message,
    ProfileFullSchema,
    ProfileMinimalSchema,
    UpdateUserChema,
    ValidationErrorMessageSchema,
)

users_router = Router()


# TODO: delete endpoint
@users_router.get("", response=list[ProfileMinimalSchema])
@paginate
def get_users(request: HttpRequest, search: str | None = None):
    """
    Gets users.
    Without `search` param gets paginated amount of users.
    With `search` param the server will return users whose `nickname` or `username` starts with `search`.
    Users who are online will be shown first.
    Paginated by the `limit` and `offset` settings.
    For example, `/users?search=pe&limit=10&offset=0` will get 10 friends from the very first one, whose
    `nickname` or `username` starts with `pe`.
    """
    if search:
        return (
            Profile.objects.prefetch_related("user")
            .filter(Q(user__nickname__istartswith=search) | Q(user__username__istartswith=search))
            .order_by("-is_online")
        )
    return Profile.objects.prefetch_related("user").all().order_by("-is_online")


@users_router.get("{username}", response={200: ProfileFullSchema, 404: Message})
def get_user(request: HttpRequest, username: str):
    """
    Gets a specific user by username.
    """
    curr_user = request.auth
    user_profile = get_profile_queryset_by_username_or_404(username)
    return user_profile.with_full_profile(curr_user, username).first()


# TODO: add authorization to settings change
@users_router.post(
    "{username}",
    response={200: ProfileMinimalSchema, frozenset({401, 404, 413}): Message, 422: list[ValidationErrorMessageSchema]},
)
def update_user(
    request: HttpRequest,
    username: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    """
    Udates settings of the user.
    Maximum size of the uploaded avatar is 10mb. Anything bigger will return 413 error.
    """
    user = request.auth

    if user.username != username:
        raise AuthenticationError

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied as exc:
        raise AuthenticationError("Old password is invalid.") from exc
    except RequestDataTooBig as exc:
        raise HttpError(413, "File is too big. Please upload a file that weights less than 10mb.") from exc

    return user.profile
