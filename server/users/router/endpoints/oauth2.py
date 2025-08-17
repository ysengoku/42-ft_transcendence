import hashlib
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


def _redirect_error(msg: str, status: int) -> HttpResponseRedirect:
    """Unified error redirect to frontend with proper encoding."""
    return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(str(msg))}&code={status}")


oauth2_router = Router()


def _get_oauth_config(platform: str) -> dict:
    """Retrieves OAuth configuration for the platform."""
    if platform not in settings.OAUTH_CONFIG:
        raise HttpError(404, f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def _check_api_availability(platform: str, config: dict) -> tuple[bool, str]:
    """Quick health check for OAuth provider API."""
    if platform == OauthConnection.FT:
        try:
            response = requests.get(config["oauth_uri"], timeout=2.0)
            if response.status_code != 200:  # noqa: PLR2004
                return False, "42 API is temporarily unavailable"
            return True, ""
        except requests.RequestException:
            return False, "Could not connect to 42 API"
    return True, ""


def _validate_scopes(granted_scopes: set, platform: str) -> str | None:
    """Validate that granted scopes are within allowed limits."""
    allowed = settings.OAUTH_ALLOWED_SCOPES[platform]
    if not granted_scopes.issubset(allowed):
        extra = ", ".join(sorted(granted_scopes - allowed))
        return f"Unexpected scopes: {extra}"
    return None


def _validate_callback_params(request: HttpRequest, platform: str) -> tuple[str, str] | HttpResponseRedirect:
    """Validate OAuth callback parameters and state. Returns (code, state) or error redirect."""
    config = _get_oauth_config(platform)

    is_available, error_msg = _check_api_availability(platform, config)
    if not is_available:
        return _redirect_error(error_msg, 503)

    params = request.GET
    error = params.get("error")
    error_description = params.get("error_description")
    code = params.get("code")
    state = params.get("state")

    if error:
        return _redirect_error(f"{error}: {error_description}", 422)

    if not code or not state:
        return _redirect_error("Missing code or state", 422)

    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()
    if not oauth_connection:
        return _redirect_error("Invalid state", 422)

    state_error = oauth_connection.check_state_and_validity(platform, state)
    if state_error:
        error_message, status_code = state_error
        return _redirect_error(error_message, status_code)

    return code, state


@csrf_exempt
@oauth2_router.get(
    "/authorize/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({404, 422}): MessageSchema},
)
def oauth_authorize(request: HttpRequest, platform: str):
    """Starts the OAuth2 authorization process and returns the authorization URL."""
    config = _get_oauth_config(platform)
    is_available, error_msg = _check_api_availability(platform, config)
    if not is_available:
        return JsonResponse({"error": error_msg}, status=422)

    state = hashlib.sha256(os.urandom(32)).hexdigest()
    OauthConnection.objects.create_pending_connection(state, platform)

    allowed_scopes = settings.OAUTH_ALLOWED_SCOPES[platform]
    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "scope": " ".join(sorted(allowed_scopes)),
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
    """Handles the OAuth2 callback and creates authenticated user session."""
    # Validate callback parameters and state
    validation_result = _validate_callback_params(request, platform)
    if isinstance(validation_result, HttpResponseRedirect):
        return validation_result
    code, state = validation_result

    # Get OAuth connection and config
    oauth_connection = OauthConnection.objects.for_state_and_pending_status(state).first()
    config = _get_oauth_config(platform)

    # Exchange code for access token
    provider_access, token_error = oauth_connection.request_access_token(config, code)
    if token_error:
        msg, status = token_error
        return _redirect_error(msg, status)

    # Validate scopes
    provider_access_token, granted_scopes = provider_access
    scope_error = _validate_scopes(granted_scopes, platform)
    if scope_error:
        return _redirect_error(scope_error, 422)

    # Get user info from provider
    user_info, user_error = oauth_connection.get_user_info(config, provider_access_token)
    if user_error:
        error_message, status_code = user_error
        return _redirect_error(error_message, status_code)

    # Create or update user
    user, user_creation_error = oauth_connection.create_or_update_user(user_info)
    if user_creation_error:
        error_message, status_code = user_creation_error
        return _redirect_error(error_message, status_code)

    # Create JWT tokens and redirect to home
    app_access_token_jwt, refresh_token_instance = RefreshToken.objects.create(user)
    return fill_response_with_jwt(
        HttpResponseRedirect(settings.HOME_REDIRECT_URL),
        app_access_token_jwt,
        refresh_token_instance,
    )
