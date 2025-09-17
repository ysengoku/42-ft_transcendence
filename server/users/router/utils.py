from django.http import HttpResponse, JsonResponse
from ninja import Router

from users.models import RefreshToken, User

auth_router = Router()


def fill_response_with_jwt(response: HttpResponse, access_token, refresh_token_instance):
    response.set_cookie("access_token", access_token, httponly=True, secure=True)
    response.set_cookie("refresh_token", refresh_token_instance.token, httponly=True, secure=True)

    return response


def create_json_response_with_jwt(user: User, json: dict):
    """
    Used for auth endpoints that ensure CSRF token.
    Sets JWT in a cookie to the response and returns it.
    """
    access_token, refresh_token_instance = RefreshToken.objects.create(user)
    response = JsonResponse(json)
    return fill_response_with_jwt(response, access_token, refresh_token_instance)
