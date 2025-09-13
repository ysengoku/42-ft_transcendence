import hashlib
import logging
import os
from urllib.parse import quote, urlencode

import requests
from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Query, Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from users.models import OauthConnection, RefreshToken
from users.models.oauth_connection import OAUTH_API_HEALTH_CHECK_TIMEOUT
from users.router.utils import fill_response_with_jwt
from users.schemas import OAuthCallbackParams

logger = logging.getLogger("server")


def _redirect_error(msg: str, status: int) -> HttpResponseRedirect:
    """Unified error redirect to frontend with proper encoding."""
    return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(str(msg))}&code={status}")


oauth2_router = Router()

ALLOWED_OAUTH_PLATFORMS = {OauthConnection.GITHUB, OauthConnection.FT}


def _validate_platform(platform: str) -> None:
    """Validate platform parameter against allowed values."""
    if platform not in ALLOWED_OAUTH_PLATFORMS:
        raise HttpError(404, f"Unsupported platform: {platform}")


def _check_api_availability(platform: str, config: dict) -> tuple[bool, str]:
    """
    Best-effort health check on the provider API.
    We first ping 'oauth_uri' with HEAD, then GET as a fallback.
    We tolerate redirects, what counts is that the provider is reachable.
    """
    url = config.get("oauth_uri")
    if not url:
        return True, ""

    try:
        resp = requests.head(url, timeout=OAUTH_API_HEALTH_CHECK_TIMEOUT, allow_redirects=True)
        if resp.status_code in (200, 204, 301, 302, 307, 308):
            return True, ""
        if resp.status_code == 405:  # noqa: PLR2004
            resp = requests.get(url, timeout=OAUTH_API_HEALTH_CHECK_TIMEOUT, allow_redirects=True)
            if resp.status_code in (200, 204):
                return True, ""
        return False, "Provider is temporarily unavailable"
    except requests.RequestException:
        return False, "Could not connect to provider"


def _validate_scopes(granted_scopes: set, platform: str) -> str | None:
    """
    Validate granted scopes only if an allowlist is configured for the platform.
    """
    allowed = set(getattr(settings, "OAUTH_ALLOWED_SCOPES", {}).get(platform, []))
    if allowed and not granted_scopes.issubset(allowed):
        extra = ", ".join(sorted(granted_scopes - allowed))
        return f"Unexpected scopes: {extra}"
    return None


def _validate_callback_params(
    request: HttpRequest,
    platform: str,
) -> tuple[str, str, OauthConnection] | HttpResponseRedirect:
    """Validate OAuth callback parameters and state. Returns (code, state, oauth_connection) or error redirect."""
    _validate_platform(platform)
    config = settings.OAUTH_CONFIG[platform]

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
        logger.warning("OAuth callback with invalid state: state=%s platform=%s", state, platform)
        return _redirect_error("Invalid state", 422)

    state_error = oauth_connection.check_state_and_validity(platform, state)
    if state_error:
        error_message, status_code = state_error
        logger.warning("OAuth state validation failed: state=%s platform=%s error=%s", state, platform, error_message)
        return _redirect_error(error_message, status_code)

    oauth_connection.mark_state_as_used()

    return code, state, oauth_connection


@oauth2_router.get(
    "/authorize/{platform}",
    auth=None,
    response={200: MessageSchema, frozenset({404, 422}): MessageSchema},
)
@csrf_exempt
def oauth_authorize(request: HttpRequest, platform: str) -> JsonResponse:
    """Starts the OAuth2 authorization process and returns the authorization URL."""
    _validate_platform(platform)
    config = settings.OAUTH_CONFIG[platform]

    is_available, error_msg = _check_api_availability(platform, config)
    if not is_available:
        return _redirect_error(error_msg, 503)

    state = hashlib.sha256(os.urandom(32)).hexdigest()
    OauthConnection.objects.create_pending_connection(state, platform)

    allowed_scopes = getattr(settings, "OAUTH_ALLOWED_SCOPES", {}).get(platform, [])

    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "state": state,
    }
    if allowed_scopes:
        params["scope"] = " ".join(sorted(set(allowed_scopes)))

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
) -> HttpResponse:
    """Handles the OAuth2 callback and creates authenticated user session."""
    validation_result = _validate_callback_params(request, platform)
    if isinstance(validation_result, HttpResponseRedirect):
        return validation_result
    code, state, oauth_connection = validation_result

    config = settings.OAUTH_CONFIG[platform]

    provider_access, token_error = oauth_connection.request_access_token(config, code)
    if token_error:
        msg, status = token_error
        return _redirect_error(msg, status)

    provider_access_token, granted_scopes = provider_access
    scope_error = _validate_scopes(granted_scopes, platform)
    if scope_error:
        logger.warning(
            "OAuth scope validation failed: platform=%s granted=%s error=%s",
            platform,
            list(granted_scopes),
            scope_error,
        )
        return _redirect_error(scope_error, 422)

    user_info, user_error = oauth_connection.get_user_info(config, provider_access_token)
    if user_error:
        error_message, status_code = user_error
        return _redirect_error(error_message, status_code)

    user, user_creation_error = oauth_connection.create_or_update_user(user_info)
    if user_creation_error:
        error_message, status_code = user_creation_error
        return _redirect_error(error_message, status_code)

    app_access_token_jwt, refresh_token_instance = RefreshToken.objects.create(user)
    logger.info(
        "OAuth authentication successful: user_id=%s platform=%s oauth_id=%s",
        user.id,
        platform,
        oauth_connection.oauth_id,
    )
    return fill_response_with_jwt(
        HttpResponseRedirect(settings.HOME_REDIRECT_URL),
        app_access_token_jwt,
        refresh_token_instance,
    )
