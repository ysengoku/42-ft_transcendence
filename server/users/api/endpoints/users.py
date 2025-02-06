from django.core.exceptions import PermissionDenied, RequestDataTooBig
from django.http import HttpRequest
from ninja import File, Form, Router
from ninja.errors import AuthenticationError, HttpError
from ninja.files import UploadedFile
from ninja.pagination import paginate

from users.api.common import allow_only_for_self, get_profile_queryset_by_username_or_404
from users.models import Profile
from users.schemas import (
    Message,
    ProfileFullSchema,
    ProfileMinimalSchema,
    UpdateUserChema,
    UserSettingsSchema,
    ValidationErrorMessageSchema,
)

users_router = Router()


# TODO: delete endpoint
@users_router.get("", response={200: list[ProfileMinimalSchema], frozenset({401}): Message})
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
    return Profile.objects.with_search(search)


@users_router.get("{username}", response={200: ProfileFullSchema, frozenset({401, 404}): Message})
def get_user(request: HttpRequest, username: str):
    """
    Gets a specific user by username.
    """
    user_profile_qs = get_profile_queryset_by_username_or_404(username)
    return user_profile_qs.with_full_profile(request.auth, username).first()


@users_router.get("{username}/settings", response={200: UserSettingsSchema, frozenset({401, 403}): Message})
def get_user_settings(request: HttpRequest, username: str):
    """
    Gets settings of a specific user by username.
    """
    return allow_only_for_self(request, username)


@users_router.post(
    "{username}/settings",
    response={
        200: ProfileMinimalSchema,
        frozenset({401, 403, 404, 413}): Message,
        422: list[ValidationErrorMessageSchema],
    },
)
def update_user_settings(
    request: HttpRequest,
    username: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    """
    Udates settings of the user.
    Maximum size of the uploaded avatar is 10mb. Anything bigger will return 413 error.
    """
    user = allow_only_for_self(request, username)

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied as exc:
        raise AuthenticationError("Old password is invalid.") from exc
    except RequestDataTooBig as exc:
        raise HttpError(413, "File is too big. Please upload a file that weights less than 10mb.") from exc

    return user.profile
