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

##### OAuth #####
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from ninja import NinjaAPI, Router
from pathlib import Path
import hashlib
import json
import os
import requests
from urllib.parse import urlencode
from django.conf import settings

# Configuration des scopes OAuth
OAUTH_CONFIG = {
    "github": {
        "scopes": ["user"],
        "user_endpoint": "https://api.github.com/user",
    },
    "42": {
        "scopes": ["public", "profile"],
        "user_endpoint": "https://api.intra.42.fr/v2/me",
    },
}

api = NinjaAPI()
oauth_router = Router()


def get_oauth_config(platform: str) -> dict:
    """Get OAuth configuration for the specified platform"""
    if platform not in OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")

    secrets_file = json.loads(Path(settings.BASE_DIR / "secrets.json").read_text())
    if platform not in secrets_file:
        raise ValueError(f"No secrets configured for platform: {platform}")

    return {**secrets_file[platform], **OAUTH_CONFIG[platform]}


@oauth_router.get("/authorize/{platform}")
def oauth_authorize(request, platform: str):
    try:
        config = get_oauth_config(platform)

        # Générer l'état pour la sécurité CSRF
        state = hashlib.sha256(os.urandom(1024)).hexdigest()
        request.session["oauth_state"] = state
        request.session["oauth_platform"] = platform

        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uris"][0],
            "scope": " ".join(config["scopes"]),
            "state": state,
        }

        auth_url = f"{config['auth_uri']}?{urlencode(params)}"
        return JsonResponse({"auth_url": auth_url})

    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": "Authorization failed"}, status=500)


@oauth_router.get("/callback")
def oauth_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")

    # Vérifier l'état pour la sécurité CSRF
    if not state or state != request.session.get("oauth_state"):
        return JsonResponse({"error": "Invalid state parameter"}, status=400)

    platform = request.session.get("oauth_platform")
    if not platform:
        return JsonResponse({"error": "No platform specified"}, status=400)

    try:
        config = get_oauth_config(platform)

        # Échanger le code contre un token
        token_response = requests.post(
            config["token_uri"],
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "redirect_uri": config["redirect_uris"][0],
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()

        if "access_token" not in token_data:
            return JsonResponse({"error": "Failed to get access token"}, status=500)

        # Récupérer les informations de l'utilisateur
        user_response = requests.get(
            config["user_endpoint"],
            headers={"Authorization": f"Bearer {token_data['access_token']}", "Accept": "application/json"},
        )
        user_data = user_response.json()

        # TODO: Créer ou mettre à jour l'utilisateur dans la base de données
        # Cette partie dépendra de votre modèle User

        return JsonResponse({"status": "success", "user": user_data})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# Enregistrer le router
api.add_router("/oauth", oauth_router)


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
