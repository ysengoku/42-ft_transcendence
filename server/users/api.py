from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.http import Http404
from ninja import NinjaAPI, File, UploadedFile, Form
from ninja.files import UploadedFile
from ninja.errors import ValidationError as NinjaValidationError
from typing import List, Optional, Dict, Annotated
from .schemas import (
    ProfileMinimalSchema,
    ProfileFullSchema,
    SignUpSchema,
    UpdateUserChema,
    Message,
    ValidationErrorMessageSchema,
)
from .models import User, Profile
from pydantic import Field

api = NinjaAPI()


@api.get("users/", response=List[ProfileMinimalSchema])
def get_users(request):
    return Profile.objects.prefetch_related("user").all()


@api.get("users/{username}", response={200: ProfileFullSchema, 404: Message})
def get_user(request, username: str):
    try:
        profile = Profile.objects.get(user__username=username)
        return 200, profile
    except Profile.DoesNotExist:
        return 404, {"msg": f"User {username} not found."}


@api.post("users/", response={201: ProfileMinimalSchema, 422: List[ValidationErrorMessageSchema]})
def register_user(request, data: SignUpSchema):
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user.profile


# TODO: add authorization to settings change
@api.post(
    "users/{username}",
    response={200: ProfileMinimalSchema, 401: Message, 404: Message, 422: List[ValidationErrorMessageSchema]},
)
def update_user(request, username: str, data: Form[UpdateUserChema], avatar_file: UploadedFile = File(description="User profile picture.", default=None)):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return 404, {"msg": f"User {username} not found."}
    if data.password and data.password_repeat:
        is_old_password_valid = authenticate(request, username=user.username, password=data.old_password)
        if not is_old_password_valid:
            return 401, {"msg": "Old password is not correct."}

    user_as_dict = user.__dict__
    for attr in data:
        if attr in user_as_dict:
            user_as_dict[attr] = data[attr]
    user.full_clean()
    return user.profile


@api.exception_handler(ValidationError)
def handle_django_validation_error(request, exc: ValidationError):
    err_response = []
    for key in exc.message_dict:
        for msg in exc.message_dict[key]:
            err_response.append(
                {
                    "type": "validation_error",
                    "loc": ["body", "payload", key],
                    "msg": msg,
                }
            )

    return api.create_response(
        request,
        err_response,
        status=422,
    )


@api.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request, exc: NinjaValidationError):
    return api.create_response(
        request,
        exc.errors,
        status=422,
    )
