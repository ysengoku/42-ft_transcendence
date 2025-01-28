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

import hashlib
import json
import os
import webbrowser
import requests
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qsl
from ninja import Router
from django.conf import settings
from django.http import JsonResponse

SCOPES_GITHUB = ["user"]
SCOPES_42 = ["public", "profile"]

api = NinjaAPI()

# Function to get OAuth secrets and scopes
def param(platform: str) -> dict:
    secrets_file = json.loads(Path(settings.BASE_DIR / "secrets.json").read_text())  # Adjust path as needed
    if platform == "github":
        secrets = secrets_file["github"]
        SCOPES = SCOPES_GITHUB
    elif platform == "42":
        secrets = secrets_file["42"]
        SCOPES = SCOPES_42
    else:
        raise ValueError(f"Unsupported platform: {platform}")

    return secrets, SCOPES

# Function to handle OAuth authorization
def authorize(secrets: dict, SCOPES: list) -> dict:
    redirect_uri = secrets["redirect_uris"][0]
    params = {
        "response_type": "code",
        "client_id": secrets["client_id"],
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "state": hashlib.sha256(os.urandom(1024)).hexdigest(),
    }

    # Create the authorization URL
    url = f"{secrets['auth_uri']}?{urlencode(params)}"
    if not webbrowser.open(url):
        raise RuntimeError("Failed to open browser")

    return url


@api.get("/oauth/authorize")
def oauth_authorize(request, platform: str):
    try:
        secrets, SCOPES = param(platform)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    # Call the authorize function to initiate the OAuth flow
    try:
        auth_url = authorize(secrets, SCOPES)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"auth_url": auth_url})

# Django view to handle the OAuth callback
@api.get("/oauth/callback")
def oauth_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")
    if not code or not state:
        return JsonResponse({"error": "Invalid callback parameters"}, status=400)

    # Exchange the code for an access token
    secrets, _ = param('github')  # Choose the platform dynamically as needed
    redirect_uri = secrets["redirect_uris"][0]
    params = {
        "client_id": secrets["client_id"],
        "client_secret": secrets["client_secret"],
        "code": code,
        "redirect_uri": redirect_uri,
    }

    response = requests.post(
        secrets["token_uri"],
        data=params,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        return JsonResponse({"error": "Failed to get access token"}, status=500)

    return JsonResponse(response.json())

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


@api.post(
    "users/",
    response={201: ProfileMinimalSchema, 422: list[ValidationErrorMessageSchema]},
)
def register_user(request: HttpRequest, data: SignUpSchema):
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user.profile


# TODO: add authorization to settings change
@api.post(
    "users/{username}",
    response={
        200: ProfileMinimalSchema,
        401: Message,
        404: Message,
        422: list[ValidationErrorMessageSchema],
    },
)
def update_user(
    request: HttpRequest,
    username: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(
        description="User profile picture.", default=None
    ),
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
            {"type": "validation_error", "loc": ["body", "payload", key], "msg": msg}
            for msg in exc.message_dict[key]
        )

    return api.create_response(request, err_response, status=422)


@api.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request: HttpRequest, exc: NinjaValidationError):
    return api.create_response(request, exc.errors, status=422)
