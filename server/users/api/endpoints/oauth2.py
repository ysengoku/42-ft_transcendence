import hashlib
import os
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import login
from django.http import HttpRequest, JsonResponse
from django.shortcuts import redirect
from django.core.exceptions import ValidationError
from ninja import Router
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from users.api.endpoints.auth import _create_json_response_with_tokens
from users.schemas import Message, ProfileMinimalSchema, SignUpSchema
from users.models import User

oauth2_router = Router()


def get_oauth_config(platform: str) -> dict:
    """
    Retrieve OAuth config for 42 or github
    """
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]

def create_user_oauth(user_info: dict, connection_type: str) -> User:
    """
    Creates a new user from OAuth data.
    """
    user = User.objects.validate_and_create_user(
        username=user_info.get("login"),
        connection_type=connection_type,
        email=user_info.get("email", ""),  # email might be optional for some platforms
        oauth_id=user_info.get("id"),
    )
    user.save()
    return user


@oauth2_router.get("/authorize/{platform}", auth=None)
def oauth_authorize(request, platform: str):
    """
    This endpoint is called when the user clicks on the login button for the platform
    t will redirect the user to the auth server to authenticate
    """
    try:
        config = get_oauth_config(platform)
        state = hashlib.sha256(os.urandom(1024)).hexdigest()  # this is to prevent csrf attacks
        print(f"print : AUTHORIZE Generated state: {state}")
        request.session["oauth_state"] = state
        request.session["oauth_platform"] = platform

        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uris"][0],  # callback
            "scope": " ".join(config["scopes"]),
            "state": state,
        }

        auth_url = f"{config['auth_uri']}?{urlencode(params)}"
        print(f"print : AUTHORIZE auth_url: {auth_url}")
        return JsonResponse({"auth_url": auth_url})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@oauth2_router.get("/callback/{platform}", response={200: ProfileMinimalSchema, 401: Message}, auth=None)
@csrf_exempt
def oauth_callback(request: HttpRequest, platform: str, code: str, state: str):
    """
    This endpoint is called by the auth server after the user has authenticated on the platform
    It will exchange the code for an access token and get the user info
    """
    if not state or state != request.session.get("oauth_state"):
        return JsonResponse({"status": "error", "error": "Invalid state parameter"}, status=400)

    platform = request.session.get("oauth_platform")
    if not platform:
        return JsonResponse({"status": "error", "error": "No platform specified"}, status=400)

    try:
        config = get_oauth_config(platform)
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
            return JsonResponse({"status": "error", "error": "Failed to get access token"}, status=500)

        user_info_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        user_info = user_info_response.json()

        connection_type_map = {
            "42": User.FT,
            "github": User.GITHUB,
        }
        connection_type = connection_type_map.get(platform)
        if not connection_type:
            return JsonResponse({"status": "error", "error": "Invalid platform"}, status=400)

        # Check if user already exists
        user = User.objects.filter(oauth_id=user_info["id"]).first()
        if user:
            print(f"print : USER EXISTS: {user.username}, {connection_type}, {user_info['id']}")
        else:
            user = create_user_oauth(user_info, connection_type)
            print(f"print : USER CREATED: {user.username}, {connection_type}, {user_info['id']}")

        # Return JSON response with tokens
        return _create_json_response_with_tokens(user, user.profile.to_profile_minimal_schema())

    except Exception as e:
        return JsonResponse({"msg": str(e)}, status=500)
