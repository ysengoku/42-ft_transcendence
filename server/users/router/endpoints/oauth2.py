import hashlib
import logging
import os
from urllib.parse import quote, urlencode

import requests
from django.conf import settings
from django.http import HttpRequest, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Query, Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from users.models import OauthConnection, RefreshToken
from users.router.utils import fill_response_with_jwt
from users.schemas import OAuthCallbackParams

oauth2_router = Router()

logger = logging.getLogger("server")

def get_oauth_config(platform: str) -> dict:
    """
    Retrieves OAuth configuration for the platform.
    Raises 404 if the platform is unsupported.
    """
    if platform not in settings.OAUTH_CONFIG:
        raise HttpError(404, f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def check_api_availability(platform: str, config: dict) -> tuple[bool, str]:
    """
    Quick health check for OAuth provider API using the OAuth endpoint
    """
    if platform == OauthConnection.FT:
        try:
            response = requests.get(config["oauth_uri"], timeout=2.0)
            if response.status_code != 200:  # noqa: PLR2004
                logging.warning("%s refused with the status code %d", platform, response.status_code)
                return False, f"{platform} API is temporarily unavailable"
            return True, ""
        except requests.RequestException as exc:
            logging.warning("Could not connect to the %s:\n%s", platform, str(exc))
            return False, f"Could not connect to {platform} API"
    return True, ""


@oauth2_router.get(
    "/authorize/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({404, 422}): MessageSchema},
)
@csrf_exempt
def oauth_authorize(request: HttpRequest, platform: str):
    """
    Starts the OAuth2 authorization process.
    Returns the authorization URL.
    Raises 404 if the platform is unsupported (raised from def get_oauth_config).
    Raises 422 if the platform is not available (raised from def check_api_availability).
    """
    config = get_oauth_config(platform)
    is_available, error_msg = check_api_availability(platform, config)
    if not is_available:
        return JsonResponse({"error": error_msg}, status=422)

    state = hashlib.sha256(os.urandom(32)).hexdigest()

    OauthConnection.objects.create_pending_connection(state, platform)

    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uris"],
        "scope": " ".join(config["scopes"]),
        "state": state,
    }
    return JsonResponse({"auth_url": f"{config['auth_uri']}?{urlencode(params)}"})


@oauth2_router.get(
    "/callback/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({404, 408, 422, 503}): MessageSchema},
)
@ensure_csrf_cookie
def oauth_callback(  # noqa: PLR0911
    request: HttpRequest,
    platform: str,
    params: OAuthCallbackParams = Query(...),
):
    """
    Handles the OAuth2 callback.
    Captures errors directly from the OAuth provider.
    """
    config = get_oauth_config(platform)

    is_available, error_msg = check_api_availability(platform, config)
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
        error_message = quote("Invalid state.")
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={error_message}&code=422")

    state_error = oauth_connection.check_state_and_validity(platform, state)
    if state_error:
        error_message, status_code = state_error
        return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(error_message)}&code={status_code}")

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

    access_token, refresh_token_instance = RefreshToken.objects.create(user)
    return fill_response_with_jwt(
        HttpResponseRedirect(settings.HOME_REDIRECT_URL),
        access_token,
        refresh_token_instance,
    )
