from django.core.exceptions import PermissionDenied, RequestDataTooBig
from django.http import HttpRequest
from ninja import File, Form, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from users.api.common import get_user_by_slug_id_or_404
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
def get_users(request: HttpRequest):
    """
    WARNING: temporary endpoint. At the moment in returns a list of all users for the testing purposes.
    """
    return Profile.objects.prefetch_related("user").all()


@users_router.get("{slug_id}", response={200: ProfileFullSchema, 404: Message})
def get_user(request: HttpRequest, slug_id: str):
    """
    Gets a specific user by slug_id.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile


# TODO: add authorization to settings change
@users_router.post(
    "{slug_id}",
    response={200: ProfileMinimalSchema, frozenset({401, 404, 413}): Message, 422: list[ValidationErrorMessageSchema]},
)
def update_user(
    request: HttpRequest,
    slug_id: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    """
    Udates settings of the user.
    Maximum size of the uploaded avatar is 10mb. Anything bigger will return 413 error.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied as exc:
        raise HttpError(401, "Old password is invalid.") from exc
    except RequestDataTooBig as exc:
        raise HttpError(413, "File is too big. Please upload a file that weights less than 10mb.") from exc

    return user.profile
