import hashlib
import os
from urllib.parse import urlencode
import requests
from django.conf import settings
from django.http import HttpRequest, JsonResponse, HttpResponseRedirect
from django.shortcuts import redirect
from ninja import Router
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from users.api.endpoints.auth import _create_redirect_to_home_page_response_with_tokens
from users.schemas import Message, ProfileMinimalSchema
from users.models import User

oauth2_router = Router()


def get_oauth_config(platform: str) -> dict:
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def create_user_oauth(user_info: dict, connection_type: str) -> User:
    try:
        user = User.objects.validate_and_create_user(
            username=user_info.get["login"],
            connection_type=connection_type,
            email=user_info.get("email", ""),
            # oauth_id=user_info.get["id"],  # Convert id to string for consistency
        )
        return user
    except Exception as e:
        raise ValueError(f"Failed to create user: {str(e)}")


@oauth2_router.get("/authorize/{platform}", auth=None)
def oauth_authorize(request, platform: str):
    try:
        config = get_oauth_config(platform)
        state = hashlib.sha256(os.urandom(32)).hexdigest()  # 32 bytes is sufficient

        # Store state in session with expiration
        request.session["oauth_state"] = state
        request.session["oauth_platform"] = platform
        # request.session.set_expiry(300)  # 5 minutes expiry

        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uris"][0],
            "scope": " ".join(config["scopes"]),
            "state": state,
        }

        auth_url = f"{config['auth_uri']}?{urlencode(params)}"
        return HttpResponseRedirect(auth_url)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@ensure_csrf_cookie
@oauth2_router.get("/callback/{platform}", auth=None)
def oauth_callback(request, platform: str, code: str, state: str):
    try:
        stored_state = request.session.get("oauth_state")
        stored_platform = request.session.get("oauth_platform")

        if not stored_state or not stored_platform:
            return JsonResponse({"error": "Session expired"}, status=401)

        if state != stored_state or platform != stored_platform:
            return JsonResponse({"error": "Invalid state parameter"}, status=400)

        # Clear session immediately
        del request.session["oauth_state"]
        del request.session["oauth_platform"]

        config = get_oauth_config(platform)

        # Exchange code for token
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
            timeout=10,  # Add timeout
        )

        if not token_response.ok:
            return JsonResponse({"error": "Failed to retrieve token"}, status=401)

        token_data = token_response.json()

        # Get user info
        user_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            timeout=10,
        )

        if not user_response.ok:
            return JsonResponse({"error": "Failed to retrieve user info"}, status=401)

        user_info = user_response.json()

        # Map platforms to connection types
        connection_type = {"42": User.FT, "github": User.GITHUB}.get(platform)
        if not connection_type:
            return JsonResponse({"error": "Invalid platform"}, status=400)

        # Get or create user
        # user = User.objects.for_oauth_id(user_info["id"]).first()
        # if not user:
        user = User.objects.create_user("Fannybooboo", "regular", email="fannybooboo@gmail.com", password="123").profile

        # user = {
        #     "username": "faboussa",
        #     "email": "fanny@example.com",
        #     "id": "fanny_oauth_id",
        #     "nickname": "fanny123",  # nickname
        #     "avatar": "https://example.com/avatar.jpg",
        # }

        response = _create_redirect_to_home_page_response_with_tokens(user)

        return response
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# creer le cookie csfr en plus de acces token et refresh token
# il faut quil yait username, nickname, avatar
# key = user.

# return _create_json_response_with_tokens(user, user.profile.to_profile_minimal_schema())
