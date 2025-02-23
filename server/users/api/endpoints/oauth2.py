import hashlib
import os
from urllib.parse import urlencode

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Query, Router
from ninja.errors import AuthenticationError, HttpError

from users.api.endpoints.auth import create_redirect_to_home_page_response_with_tokens
from users.models import OauthConnection, User
from users.schemas import (
    Message,
    OAuthCallbackParams,
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


@oauth2_router.get("/callback/{platform}", auth=None, response={200: dict, frozenset({408, 422}): Message})
@ensure_csrf_cookie
def oauth_callback(
    request,
    platform: str,
    params: OAuthCallbackParams = Query(...),
):
    """
    Handles the OAuth2 callback.
    Captures errors directly from the OAuth provider.
    """
    params = request.GET
    error = params.get("error")
    error_description = params.get("error_description")
    code = params.get("code")
    state = params.get("state")

    if error:
        raise HttpError(401, f"Provider error: {error} - {error_description or ''}")

    if not code or not state:
        raise HttpError(422, "Invalid request: missing code or state parameter")

    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()
    if not oauth_connection:
        raise AuthenticationError("Invalid OAuth connection.")

    oauth_connection.check_state_and_validity(platform, state)

    config = get_oauth_config(platform)

    access_token = oauth_connection.request_access_token(config, code)

    user_info = oauth_connection.get_user_info(config, access_token)

    if platform not in [OauthConnection.FT, OauthConnection.GITHUB]:
        raise HttpError(422, "Invalid platform")

    user = oauth_connection.create_or_update_user(user_info)

    return create_redirect_to_home_page_response_with_tokens(user)
