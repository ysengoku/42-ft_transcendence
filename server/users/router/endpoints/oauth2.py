import hashlib
import os
from urllib.parse import quote, urlencode

import requests
from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Query, Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from users.models import OauthConnection, User
from users.router.utils import create_redirect_to_home_page_response_with_tokens
from users.schemas import (
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


def check_api_availability(platform: str, config: dict) -> tuple[bool, str]:
    """
    Quick health check for OAuth provider API using the OAuth endpoint
    """
    if platform == OauthConnection.FT:
        try:
            response = requests.get(config["oauth_uri"], timeout=2.0)
            if response.status_code != 200:  # noqa: PLR2004
                return False, "42 API is temporarily unavailable"
            return True, ""
        except requests.RequestException:
            return False, "Could not connect to 42 API"
    return True, ""


@csrf_exempt
@oauth2_router.get(
    "/authorize/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({404, 422}): MessageSchema},
)
def oauth_authorize(request, platform: str):
    """
    Starts the OAuth2 authorization process.
    Returns the authorization URL.
    Raises 404 if the platform is unsupported (raised from def get_oauth_config).
    Raises 422 if the platform is not available (raised from def check_api_availability).
    """
    is_available, error_msg = check_api_availability(platform, get_oauth_config(platform))
    if not is_available:
        return JsonResponse({"error": error_msg}, status=422)

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


@oauth2_router.get(
    "/callback/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({408, 422, 503}): MessageSchema},
)
@ensure_csrf_cookie
def oauth_callback(  # noqa: PLR0911
    request,
    platform: str,
    params: OAuthCallbackParams = Query(...),
):
    """
    Handles the OAuth2 callback.
    Captures errors directly from the OAuth provider.
    """
    is_available, error_msg = check_api_availability(platform, get_oauth_config(platform))
    if not is_available:
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_msg)}&code=404")

    params = request.GET
    error = params.get("error")
    error_description = params.get("error_description")
    code = params.get("code")
    state = params.get("state")

    if error:
        error_message = quote(f"{error}: {error_description}")
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={error_message}&code=422")

    if not code or not state:
        error_message = quote("Missing code or state.")
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={error_message}&code=422")

    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()
    if not oauth_connection:
        raise HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error=Invalid state&code=422")

    state_error = oauth_connection.check_state_and_validity(platform, state)
    if state_error:
        error_message, status_code = state_error
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_message)}&code={status_code}")

    config = get_oauth_config(platform)

    access_token, token_error = oauth_connection.request_access_token(config, code)
    if token_error:
        error_message, status_code = token_error
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_message)}&code={status_code}")

    user_info, user_error = oauth_connection.get_user_info(config, access_token)
    if user_error:
        error_message, status_code = user_error
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_message)}&code={status_code}")

    if platform not in [OauthConnection.FT, OauthConnection.GITHUB]:
        error_message = quote("Unsupported platform")
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={error_message}&code=422")

    user, user_creation_error = oauth_connection.create_or_update_user(user_info)
    if user_creation_error:
        error_message, status_code = user_creation_error
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_message)}&code={status_code}")

    return create_redirect_to_home_page_response_with_tokens(user)
