import hashlib
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.exceptions import RequestAborted
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router
from ninja.errors import AuthenticationError, HttpError

from users.api.endpoints.auth import create_redirect_to_home_page_response_with_tokens
from users.models import OauthConnection, User
from users.schemas import (
    Message,
)

oauth2_router = Router()


def get_oauth_config(platform: str) -> dict:
    """
    Retrieves OAuth configuration for the platform.
    Raises 400 if the platform is unsupported.
    """
    if platform not in settings.OAUTH_CONFIG:
        raise HttpError(400, f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def create_user_oauth(user_info: dict, oauth_connection: OauthConnection) -> User:
    """
    Creates a user linked to the OAuth connection.
    """
    user = User.objects.validate_and_create_user(
        username=user_info.get("login"),
        oauth_connection=oauth_connection,
    )
    oauth_connection.set_connection_as_connected(user_info, user)
    return user


@csrf_exempt
@oauth2_router.get("/authorize/{platform}", auth=None, response={200: dict, 400: Message})
def oauth_authorize(request, platform: str):
    """
    Starts the OAuth2 authorization process.
    Returns the authorization URL.
    Raises 400 if the platform is unsupported.
    """
    config = get_oauth_config(platform)
    if not config:
        raise HttpError(400, "OAuth platform not supported")

    state = hashlib.sha256(os.urandom(32)).hexdigest()

    OauthConnection.objects.create_pending_connection(state, platform)

    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uris"][0],
        "scope": " ".join(config["scopes"]),
        "state": state,
    }
    return JsonResponse({"auth_url": f"{config['auth_uri']}?{urlencode(params)}"})


@ensure_csrf_cookie
@oauth2_router.get("/callback/{platform}", auth=None, response={200: dict, 400: Message, 401: Message})
def oauth_callback(request, platform: str, code: str, state: str):
    """
    Handles the OAuth2 callback.
    Exchanges the code for tokens and retrieves user info.
    Raises 400 for invalid state, 401 for expired sessions or failed token retrieval.
    """
    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()

    if not oauth_connection:
        raise AuthenticationError("Invalid OAuth connection.")

    now = datetime.now(timezone.utc)
    if oauth_connection.date + timedelta(minutes=5) < now:
        raise AuthenticationError("Session expired")

    if state != oauth_connection.state or platform != oauth_connection.connection_type:
        raise HttpError(400, "Invalid state parameter")

    # Request access token
    config = get_oauth_config(platform)

    try:
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
            timeout=10,
        )

        if "access_token" not in token_response.json():
            raise AuthenticationError("Failed to retrieve the token.")

    except RequestAborted as exc:
        raise HttpError(408, "The request timed out while retrieving the token.") from exc


    token_data = token_response.json()

    # Get user info
    try:
        user_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            timeout=10,
        )

    except RequestAborted as exc:
        raise HttpError(408, "The request timed out while retrieving user information.") from exc
    except requests.ConnectionError:
        raise HttpError(503, "Failed to connect to the server while retrieving user information.") from None
    except requests.RequestException as exc:
        raise AuthenticationError(f"An error occurred while retrieving user information: {str(exc)}") from None

    user_info = user_response.json()

    if platform not in [OauthConnection.FT, OauthConnection.GITHUB]:
        raise HttpError(400, "Invalid platform")

    # Get or create user
    user = User.objects.for_oauth_id(user_info["id"]).first()
    if not user:
        user = create_user_oauth(user_info, oauth_connection)
        if not user:
            raise AuthenticationError("Failed to create user in database.")

    return create_redirect_to_home_page_response_with_tokens(user)
