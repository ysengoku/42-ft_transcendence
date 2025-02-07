import hashlib
import os
from urllib.parse import urlencode
import requests
from django.conf import settings
from django.http import HttpRequest, JsonResponse, HttpResponseRedirect
from django.shortcuts import redirect
from ninja import Router
from django.views.decorators.csrf import csrf_exempt
from users.api.endpoints.auth import _create_json_response_with_tokens
from users.schemas import Message, ProfileMinimalSchema
from users.models import User

oauth2_router = Router()


def get_oauth_config(platform: str) -> dict:
    """
    Retrieve OAuth configuration for the given platform (42 or GitHub).
    """
    if platform not in settings.OAUTH_CONFIG:
        raise ValueError(f"Unsupported platform: {platform}")
    return settings.OAUTH_CONFIG[platform]


def create_user_oauth(user_info: dict, connection_type: str) -> User:
    """
    Create a new user from OAuth data if they don't already exist.
    """
    user = User.objects.validate_and_create_user(
        username=user_info.get("login"),
        connection_type=connection_type,
        email=user_info.get("email", ""),  # Email might be optional for some platforms
        oauth_id=user_info.get("id"),
    )
    user.save()
    return user


@oauth2_router.get("/authorize/{platform}", auth=None)
def oauth_authorize(request: HttpRequest, platform: str):
    """
    Initiates the OAuth2 authorization flow by redirecting the user directly to the provider's authorization page.
    """
    try:
        config = get_oauth_config(platform)
        state = hashlib.sha256(os.urandom(1024)).hexdigest()
        request.session["oauth_state"] = state
        request.session["oauth_platform"] = platform

        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uris"][0],
            "scope": " ".join(config["scopes"]),
            "state": state,
        }

        print(f"State in authorize: {state}")
        auth_url = f"{config['auth_uri']}?{urlencode(params)}"
        print(f"Auth URL: {auth_url}")
        return HttpResponseRedirect(auth_url)  # Redirection directe au lieu de JsonResponse

    except Exception as e:
        print(f"Error in oauth_authorize: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@oauth2_router.get("/callback/{platform}", response={200: ProfileMinimalSchema, 401: Message}, auth=None)
@csrf_exempt
def oauth_callback(request: HttpRequest, platform: str, code: str, state: str):
    try:
        print(f"State in callback: {state}")
        print(f"Code in callback: {code}")
        print(f"Platform in callback: {platform}")

        if state != request.session.get("oauth_state"):
            print("Invalid state parameter")
            return JsonResponse({"status": "error", "error": "Invalid state parameter"}, status=400)

        config = get_oauth_config(platform)
        print(f"Config for {platform}: {config}")

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
        print(f"Token response status: {token_response.status_code}")
        print(f"Token response text: {token_response.text}")

        token_data = token_response.json()
        print(f"Token data: {token_data}")

        if "access_token" not in token_data:
            print("Failed to retrieve access token")
            return JsonResponse({"status": "error", "error": "Failed to retrieve access token"}, status=500)

        user_info_response = requests.get(
            config["user_info_uri"],
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        print(f"User info response status: {user_info_response.status_code}")

        user_info = user_info_response.json()

        connection_type_map = {"42": User.FT, "github": User.GITHUB}
        connection_type = connection_type_map.get(platform)
        print(f"Connection type: {connection_type}")

        if not connection_type:
            print("Invalid platform")
            return JsonResponse({"status": "error", "error": "Invalid platform"}, status=400)

        user = User.objects.filter(oauth_id=user_info["id"]).first()
        if not user:
            print("Creating new user")
            user = create_user_oauth(user_info, connection_type)
        else:
            print(f"User already exists: {user.username}")

        response_data = user.profile.to_profile_minimal_schema()
        tokens = _create_json_response_with_tokens(user, response_data)
        print(f"Tokens generated: {tokens}")

        # Retourner directement la réponse JSON avec les tokens et les données utilisateur
        return JsonResponse({
            "status": "success",
            "access_token": tokens['access_token'],
            "refresh_token": tokens['refresh_token'],
            "user": response_data
        })

    except Exception as e:
        import traceback
        print(f"OAuth callback error: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({"msg": str(e)}, status=500)