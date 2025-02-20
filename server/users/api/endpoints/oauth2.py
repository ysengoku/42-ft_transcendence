import hashlib
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.exceptions import RequestAborted
from django.http import HttpResponseRedirect, JsonResponse
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
    Raises 422 if the platform is unsupported.
    """
    if platform not in settings.OAUTH_CONFIG:
        raise HttpError(422, f"Unsupported platform: {platform}")
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
@oauth2_router.get("/authorize/{platform}", auth=None, response={200: dict, 404: Message})
def oauth_authorize(request, platform: str):
    """
    Starts the OAuth2 authorization process.
    Returns the authorization URL.
    Raises 404 if the platform is unsupported (raised from def get_oauth_config).
    """
    config = get_oauth_config(platform)

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


def check_state_and_code(request, platform: str, code: str, state: str, oauth_connection: OauthConnection):
    """
    Checks the state and code from the OAuth callback.
    Raises 422 if the state or code is missing.
    Raises 408 if the state is expired.
    Raises 422 if the state or platform is invalid.
    """
    if not code or not state:
        raise HttpError(422, "Invalid request: missing code or state parameter")
    now = datetime.now(timezone.utc)

    if oauth_connection.date + timedelta(minutes=5) < now:
        raise HttpError(408, "Expired state: authentication request timed out")

    if state != oauth_connection.state or platform != oauth_connection.connection_type:
        raise HttpError(422, "Invalid state parameter")

    return None


def get_or_create_user(user_info: dict, platform: str, oauth_connection: OauthConnection) -> User:
    """
    Gets or creates a user based on the user info.
    """
    user = User.objects.for_oauth_id(user_info["id"]).first()
    if not user:
        user = create_user_oauth(user_info, oauth_connection)
        if not user:
            raise AuthenticationError("Failed to create user in database.")
    else:
        old_oauth_connection = user.get_oauth_connection()
        if old_oauth_connection:
            old_oauth_connection.delete()
        oauth_connection.set_connection_as_connected(user_info, user)
    return user


def request_access_token(config: dict, code: str) -> str:
    """
    Requests an access token from the OAuth provider.
    Returns the access token if successful.
    Raises appropriate HTTP errors on failure.
    """
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

        token_data = token_response.json()

        if token_response.status_code != 200 or "access_token" not in token_data:
            provider_error = token_data.get("error", "unknown_error")
            is_client_error = provider_error in ["invalid_request", "invalid_client", "invalid_grant"]
            if is_client_error:
                raise HttpError(503, f"Service unavailable: {provider_error}")
            raise HttpError(422, f"Unprocessable entity: {provider_error}")

        return token_data["access_token"]

    except RequestAborted:
        raise HttpError(408, "Request timeout while retrieving token")
    except requests.exceptions.JSONDecodeError:
        raise HttpError(408, "Invalid JSON response from authorization server")
    except requests.exceptions.RequestException as exc:
        raise HttpError(500, f"Request error: {str(exc)}")


def get_user_info(config: dict, access_token: str) -> dict:
    """
    Gets user information from the OAuth provider using the access token.
    Returns the user information if successful.
    Raises appropriate HTTP errors on failure.
    """
    try:
        user_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if user_response.status_code != 200:
            try:
                error_data = user_response.json()
                provider_error = error_data.get("error", "api_error")
            except:
                provider_error = "api_error"
            raise HttpError(401, f"User info error: {provider_error}")

        return user_response.json()

    except RequestAborted as exc:
        raise HttpError(408, "The request timed out while retrieving user information.") from exc
    except requests.ConnectionError:
        raise HttpError(503, "Failed to connect to the server while retrieving user information.") from None
    except requests.RequestException as exc:
        raise AuthenticationError(f"An error occurred while retrieving user information: {str(exc)}") from None


@ensure_csrf_cookie
@oauth2_router.get("/callback/{platform}", auth=None, response={200: dict, frozenset({408, 422, 500, 503}): Message})
def oauth_callback(
    request,
    platform: str,
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
):
    """
    Handles the OAuth2 callback.
    Captures errors directly from the OAuth provider.
    """
    if error:
        raise HttpError(401, f"Provider error: {error} - {error_description or ''}")

    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()
    if not oauth_connection:
        raise AuthenticationError("Invalid OAuth connection.")

    check_state_and_code(request, platform, code, state, oauth_connection)

    # Get OAuth configuration
    config = get_oauth_config(platform)

    # Get access token
    access_token = request_access_token(config, code)

    # Get user info
    user_info = get_user_info(config, access_token)

    if platform not in [OauthConnection.FT, OauthConnection.GITHUB]:
        raise HttpError(422, "Invalid platform")

    user = get_or_create_user(user_info, platform, oauth_connection)

    return create_redirect_to_home_page_response_with_tokens(user)
