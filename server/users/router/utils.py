from django.http import JsonResponse
from ninja import Router

from users.models import RefreshToken, User

auth_router = Router()


def create_json_response_with_tokens(user: User, json: dict):
    """
    Used for auth endpoints that ensure CSRF token.
    Sets JWT in a cookie to the response and returns it.
    """
    access_token, refresh_token_instance = RefreshToken.objects.create(user)

    response = JsonResponse(json)
    response.set_cookie("access_token", access_token)
    response.set_cookie("refresh_token", refresh_token_instance.token)

    return response
