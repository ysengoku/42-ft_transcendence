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
from users.models.oauth_connection import OAUTH_API_HEALTH_CHECK_TIMEOUT
from users.router.utils import fill_response_with_jwt
from users.schemas import OAuthCallbackParams

logger = logging.getLogger("server")


def _redirect_error(msg: str, status: int) -> HttpResponseRedirect:
    """Unified error redirect to frontend with proper encoding."""
    return HttpResponseRedirect(f"{settings.ERROR_REDIRECT_URL}?error={quote(str(msg))}&code={status}")


oauth2_router = Router()

# Allowed OAuth platforms for security validation
ALLOWED_OAUTH_PLATFORMS = {OauthConnection.GITHUB, OauthConnection.FT}


def _validate_platform(platform: str) -> None:
    """Validate platform parameter against allowed values."""
    if platform not in ALLOWED_OAUTH_PLATFORMS:
        raise HttpError(404, f"Unsupported platform: {platform}")


def _get_oauth_config(platform: str) -> dict:
    """Retrieves OAuth configuration for the platform."""
    _validate_platform(platform)
    
    try:
        oauth_config = getattr(settings, 'OAUTH_CONFIG', {})
        if platform not in oauth_config:
            logger.error("OAuth configuration missing for platform: %s", platform)
            raise HttpError(503, "OAuth service temporarily unavailable")
        
        config = oauth_config[platform]
        
        # Validate required configuration fields
        required_fields = ['client_id', 'client_secret', 'auth_uri', 'token_uri', 'user_info_uri', 'redirect_uri']
        missing_fields = [field for field in required_fields if not config.get(field)]
        
        if missing_fields:
            logger.error(
                "OAuth configuration incomplete for platform %s, missing: %s",
                platform, missing_fields
            )
            raise HttpError(503, "OAuth service temporarily unavailable")
            
        return config
        
    except AttributeError:
        logger.error("OAUTH_CONFIG setting not found")
        raise HttpError(503, "OAuth service temporarily unavailable")


def _check_api_availability(platform: str, config: dict) -> tuple[bool, str]:
    """Quick health check for OAuth provider API."""
    if platform == OauthConnection.FT:
        try:
            response = requests.get(config["oauth_uri"], timeout=OAUTH_API_HEALTH_CHECK_TIMEOUT)
            if response.status_code != 200:  # noqa: PLR2004
                return False, "42 API is temporarily unavailable"
            return True, ""
        except requests.RequestException:
            return False, "Could not connect to 42 API"
    return True, ""


def _validate_scopes(granted_scopes: set, platform: str) -> str | None:
    """Validate that granted scopes are within allowed limits."""
    try:
        allowed_scopes_config = getattr(settings, 'OAUTH_ALLOWED_SCOPES', {})
        if platform not in allowed_scopes_config:
            logger.error("OAuth allowed scopes configuration missing for platform: %s", platform)
            return "OAuth configuration error"
            
        allowed = set(allowed_scopes_config[platform])
        if not granted_scopes.issubset(allowed):
            extra = ", ".join(sorted(granted_scopes - allowed))
            return f"Unexpected scopes: {extra}"
        return None
        
    except (AttributeError, TypeError):
        logger.error("OAUTH_ALLOWED_SCOPES setting invalid or missing")
        return "OAuth configuration error"


def _validate_callback_params(request: HttpRequest, platform: str) -> tuple[str, str, OauthConnection] | HttpResponseRedirect:
    """Validate OAuth callback parameters and state. Returns (code, state, oauth_connection) or error redirect."""
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
        logger.warning("OAuth callback with invalid state: state=%s platform=%s", state, platform)
        return _redirect_error("Invalid state", 422)

    state_error = oauth_connection.check_state_and_validity(platform, state)
    if state_error:
        error_message, status_code = state_error
        logger.warning(
            "OAuth state validation failed: state=%s platform=%s error=%s",
            state, platform, error_message
        )
        return _redirect_error(error_message, status_code)

    # Mark state as used to prevent replay attacks
    oauth_connection.mark_state_as_used()

    return code, state, oauth_connection


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

    try:
        allowed_scopes_config = getattr(settings, 'OAUTH_ALLOWED_SCOPES', {})
        if platform not in allowed_scopes_config:
            logger.error("OAuth allowed scopes configuration missing for platform: %s", platform)
            return JsonResponse({"error": "OAuth service temporarily unavailable"}, status=503)
        allowed_scopes = allowed_scopes_config[platform]
    except (AttributeError, TypeError):
        logger.error("OAUTH_ALLOWED_SCOPES setting invalid or missing")
        return JsonResponse({"error": "OAuth service temporarily unavailable"}, status=503)
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
    code, state, oauth_connection = validation_result

    # Get OAuth config
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
        logger.warning(
            "OAuth scope validation failed: platform=%s granted=%s error=%s",
            platform, list(granted_scopes), scope_error
        )
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
    logger.info(
        "OAuth authentication successful: user_id=%s platform=%s oauth_id=%s",
        user.id, platform, oauth_connection.oauth_id
    )
    return fill_response_with_jwt(
        HttpResponseRedirect(settings.HOME_REDIRECT_URL),
        app_access_token_jwt,
        refresh_token_instance,
    )
