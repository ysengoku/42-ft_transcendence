import hashlib
import logging
import os
from urllib.parse import urlencode

from jsonschema import ValidationError
import requests
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from ninja import Router
from .models import User
from django.contrib.auth import login

logger = logging.getLogger(__name__)
oauth_router = Router()


def get_oauth_config(platform: str) -> dict:
    """
    Retrieve OAuth config for a specific platform
    """
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


@oauth_router.get("/authorize/{platform}")
def oauth_authorize(request, platform: str):
    try:
        logger.info(f"Starting OAuth authorization for platform: {platform}")

        config = get_oauth_config(platform)
        state = hashlib.sha256(os.urandom(1024)).hexdigest()  # this is to prevent csrf attacks
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

        # Exchange the authorization code for an access token, all through the backend, nothing is exposed to the frontend
        token_response = requests.post(  # request to the auth server to get the access token
            config["token_uri"],
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "redirect_uri": config["redirect_uris"][0],
                "grant_type": "authorization_code",  # this is the type of oauth2 grant
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

        # function to create user in the database

        user_info = user_info_response.json()

        connection_type_map = {
            "42": User.FT,
            "github": User.GITHUB,
        }

        connection_type = connection_type_map.get(platform)

        if not connection_type:
            return JsonResponse({"status": "error", "error": "Invalid platform"}, status=400)
        
        login_name = user_info.get("login")
        if not login_name:
            return JsonResponse({"status": "error", "error": "Failed to get user info"}, status=500)
        
        user = User.objects.find_by_identifier(login_name, connection_type)

        if not user:
            try:
                email = user_info.get("email", "") # email is optional because github api does not return email
                user = User.objects.create_user(
                    username=login_name,
                    connection_type=connection_type,
                    email=email,
                )
            except ValidationError as e:
                return JsonResponse({"status": "error",
                                     "error": "Validation error",
                                     "details": e.message_dict}, status=400)
            except Exception as e:
                return JsonResponse({"status": "error", "error": str(e)}, status=400)

     # Create session or token for authenticated user
        login(request, user) # this is to authenticate the user, maintain the session and create the token. if use of JWT, this line has to be removed

        return JsonResponse({"status": "success", "message": "Authentication successful", "user_info":{"slug_id": user.slug_id, "username": user.username}})
    

    except Exception as e:
        print(f"Error during OAuth callback: {e}")
        return JsonResponse({"status": "error", "error": "Internal server error"}, status=500)


##### END OAuth #####

TODO: #need to secure the callback endpoint. check that the callback is coming from the same domain and is the same one that was sent to the auth server
TODO: # need to store the access token in the database in an encrypted form, that way it avoids multiple calls to the api , where there is always a risk of the token being stolen
