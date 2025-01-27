from django.core.exceptions import PermissionDenied, ValidationError
from django.http import HttpRequest
from ninja import File, Form, NinjaAPI
from ninja.errors import ValidationError as NinjaValidationError
from ninja.files import UploadedFile

from .models import Profile, User
from .schemas import (
    Message,
    ProfileFullSchema,
    ProfileMinimalSchema,
    SignUpSchema,
    UpdateUserChema,
    ValidationErrorMessageSchema,
)

api = NinjaAPI()


@api.get("users/", response=list[ProfileMinimalSchema])
def get_users(request: HttpRequest):
    return Profile.objects.prefetch_related("user").all()


@api.get("users/{username}", response={200: ProfileFullSchema, 404: Message})
def get_user(request: HttpRequest, username: str):
    try:
        profile = Profile.objects.get(user__username=username)
        return 200, profile
    except Profile.DoesNotExist:
        return 404, {"msg": f"User {username} not found."}


@api.post("users/", response={201: ProfileMinimalSchema, 422: list[ValidationErrorMessageSchema]})
def register_user(request: HttpRequest, data: SignUpSchema):
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user.profile


# TODO: add authorization to settings change
@api.post(
    "users/{username}",
    response={200: ProfileMinimalSchema, 401: Message, 404: Message, 422: list[ValidationErrorMessageSchema]},
)
def update_user(
    request: HttpRequest,
    username: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return 404, {"msg": f"User {username} not found."}

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied:
        return 401, {"msg": "Old password is invalid."}

    return user.profile


@api.exception_handler(ValidationError)
def handle_django_validation_error(request: HttpRequest, exc: ValidationError):
    err_response = []
    for key in exc.message_dict:
        err_response.extend(
            {"type": "validation_error", "loc": ["body", "payload", key], "msg": msg} for msg in exc.message_dict[key]
        )

    return api.create_response(request, err_response, status=422)


@api.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request: HttpRequest, exc: NinjaValidationError):
    return api.create_response(request, exc.errors, status=422)
