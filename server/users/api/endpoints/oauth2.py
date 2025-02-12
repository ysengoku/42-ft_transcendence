import hashlib
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router

from users.api.endpoints.auth import create_redirect_to_home_page_response_with_tokens
from users.models import OauthConnection, User

oauth2_router = Router()


def get_oauth_config(platform: str) -> dict:
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def create_user_oauth(user_info: dict, oauth_connection: OauthConnection) -> User:
    user = User.objects.validate_and_create_user(
        username=user_info.get("login"),
        oauth_connection=oauth_connection,
    )

    oauth_connection.set_connection_as_connected(user_info, user)
    return user


@csrf_exempt
@oauth2_router.get("/authorize/{platform}", auth=None)
def oauth_authorize(request, platform: str):
    config = get_oauth_config(platform)
    state = hashlib.sha256(os.urandom(32)).hexdigest()  # 32 bytes is sufficient

    # Store state in session with expiration
    OauthConnection.objects.create_pending_connection(state, platform)
    # request.session.set_expiry(300)  # 5 minutes expiry

    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uris"][0],
        "scope": " ".join(config["scopes"]),
        "state": state,
    }
    return JsonResponse(
        {
            "auth_url": f"{config['auth_uri']}?{urlencode(params)}",
        },
    )


@ensure_csrf_cookie
@oauth2_router.get("/callback/{platform}", auth=None)
def oauth_callback(request, platform: str, code: str, state: str):
    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()

    now = datetime.now(timezone.utc)
    if oauth_connection.date + timedelta(minutes=5) < now:
        return JsonResponse({"msg": "Session expired"}, status=401)

    if state != oauth_connection.state or platform != oauth_connection.connection_type:
        return JsonResponse({"msg": "Invalid state parameter"}, status=400)

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
        return JsonResponse({"msg": "Failed to retrieve token"}, status=401)

    token_data = token_response.json()

    # Get user info
    user_response = requests.get(
        config["user_info_uri"],
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
        timeout=10,
    )

    if not user_response.ok:
        return JsonResponse({"msg": "Failed to retrieve user info"}, status=401)

    user_info = user_response.json()

    # Map platforms to connection types
    if platform not in [OauthConnection.FT, OauthConnection.GITHUB]:
        return JsonResponse({"msg": "Invalid platform"}, status=400)

    # Get or create user
    user = User.objects.for_oauth_id(user_info["id"]).first()
    if not user:
        user = create_user_oauth(user_info, oauth_connection)

    return create_redirect_to_home_page_response_with_tokens(user)
