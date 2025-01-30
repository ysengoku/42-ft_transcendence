from django.http import JsonResponse
from ninja import Router
import hashlib
import os
import requests
from urllib.parse import urlencode
from django.conf import settings
import logging
from django.shortcuts import redirect

logger = logging.getLogger(__name__)
oauth_router = Router()


def get_oauth_config(platform: str) -> dict:
    """Retrieve OAuth config for a specific platform"""
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


@oauth_router.get("/authorize/{platform}")
def oauth_authorize(request, platform: str):
    try:
        logger.info(f"Starting OAuth authorization for platform: {platform}")

        config = get_oauth_config(platform)
        state = hashlib.sha256(os.urandom(1024)).hexdigest()
        request.session["oauth_state"] = state
        request.session["oauth_platform"] = platform

        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uris"][0],  # callback
            "scope": " ".join(config["scopes"]),
            "state": state,
        }

        auth_url = f"{config['auth_uri']}?{urlencode(params)}"
        return JsonResponse({"auth_url": auth_url})

    except Exception as e:
        logger.error(f"Error in OAuth authorization: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


# Backend: oauth_router.py


@oauth_router.get("/callback/{platform}")
def oauth_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")

    # Verify the state parameter for security
    if not state or state != request.session.get("oauth_state"):
        return JsonResponse({"status": "error", "error": "Invalid state parameter"}, status=400)

    platform = request.session.get("oauth_platform")
    if not platform:
        return JsonResponse({"status": "error", "error": "No platform specified"}, status=400)

    try:
        config = get_oauth_config(platform)

        # Exchange the authorization code for an access token
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
        )

        token_data = token_response.json()

        if "access_token" not in token_data:
            return JsonResponse({"status": "error", "error": "Failed to get access token"}, status=500)

        # Fetch user information using the access token
        user_info_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )

        user_info = user_info_response.json()

        # Extract only the required fields based on the platform
        if platform == "github":
            simplified_user_info = {
                "login": user_info.get("login"),
            }
        elif platform == "42":
            simplified_user_info = {
                "login": user_info.get("login"),
            }
        else:
            simplified_user_info = {}

        return JsonResponse(
            {
                "status": "success",
                "message": "Authentication successful",
                "user_info": simplified_user_info,
            }
        )

    except Exception as e:
        print(f"Error during OAuth callback: {e}")
        return JsonResponse({"status": "error", "error": "Internal server error"}, status=500)




##### END OAuth #####
