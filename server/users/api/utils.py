from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from ninja import Router

from users.models import RefreshToken, User

auth_router = Router()


def _create_json_response_with_tokens(user: User, json: dict):
    access_token, refresh_token_instance = RefreshToken.objects.create(user)

    response = JsonResponse(json)
    response.set_cookie("access_token", access_token)
    response.set_cookie("refresh_token", refresh_token_instance.token)

    return response


def create_redirect_to_home_page_response_with_tokens(user: User):
    access_token, refresh_token_instance = RefreshToken.objects.create(user)

    response = HttpResponseRedirect(settings.HOME_REDIRECT_URL)
    response.set_cookie("access_token", access_token)
    response.set_cookie("refresh_token", refresh_token_instance.token)

    return response
