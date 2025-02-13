from django.http import HttpRequest, HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router
from ninja.errors import AuthenticationError, HttpError

from users.api.common import allow_only_for_self
from users.models import OauthConnection, RefreshToken, User
from users.schemas import (
    LoginSchema,
    Message,
    ProfileMinimalSchema,
    SignUpSchema,
    ValidationErrorMessageSchema,
)

auth_router = Router()


def _create_json_response_with_tokens(user: User, json: dict):
    access_token, refresh_token_instance = RefreshToken.objects.create(user)

    response = JsonResponse(json)
    response.set_cookie("access_token", access_token)
    response.set_cookie("refresh_token", refresh_token_instance.token)

    return response


def create_redirect_to_home_page_response_with_tokens(user: User):
    access_token, refresh_token_instance = RefreshToken.objects.create(user)

    response = HttpResponseRedirect("https://localhost:1026/home")
    response.set_cookie("access_token", access_token)
    response.set_cookie("refresh_token", refresh_token_instance.token)

    return response


@auth_router.get("self", response={200: ProfileMinimalSchema, 401: Message})
def check_self(request: HttpRequest):
    """
    Checks authentication status of the user.
    If the user has valid access token, returns minimal information of user's profile.
    """
    return request.auth.profile


# TODO: add secure options for the cookie
@auth_router.post("login", response={200: ProfileMinimalSchema, 401: Message, 429: Message}, auth=None)
@ensure_csrf_cookie
@csrf_exempt
def login(request: HttpRequest, credentials: LoginSchema):
    """
    Logs in user. Can login by username, email or username.
    """
    user = User.objects.for_username_or_email(credentials.username).first()
    if not user:
        raise HttpError(401, "Username or password are not correct.")

    is_password_correct = user.check_password(credentials.password)
    if not is_password_correct:
        raise HttpError(401, "Username or password are not correct.")

    return _create_json_response_with_tokens(user, user.profile.to_profile_minimal_schema())


@auth_router.post(
    "signup",
    response={201: ProfileMinimalSchema, 422: list[ValidationErrorMessageSchema]},
    auth=None,
)
@ensure_csrf_cookie
@csrf_exempt
def signup(request: HttpRequest, data: SignUpSchema):
    """
    Creates a new user.
    """
    user = User.objects.validate_and_create_user(
        username=data.username,
        email=data.email,
        password=data.password,
    )
    user.save()

    return _create_json_response_with_tokens(user, user.profile.to_profile_minimal_schema())


@auth_router.post(
    "refresh",
    response={204: None, 401: Message},
    auth=None,
)
def refresh(request: HttpRequest, response: HttpResponse):
    """
    Rotates the refresh token. Issues a new refresh token and a new access token.
    """
    old_refresh_token = request.COOKIES.get("refresh_token")
    if not old_refresh_token:
        raise AuthenticationError

    new_access_token, new_refresh_token_instance = RefreshToken.objects.rotate(old_refresh_token)

    response.set_cookie("access_token", new_access_token)
    response.set_cookie("refresh_token", new_refresh_token_instance.token)
    return 204, None


@auth_router.delete(
    "logout",
    response={204: None, 401: Message},
)
def logout(request: HttpRequest, response: HttpResponse):
    """
    Logs out the user. Clears the tokens from the cookies.
    """
    old_refresh_token = request.COOKIES.get("refresh_token")
    if not old_refresh_token:
        raise AuthenticationError

    refresh_token_qs = RefreshToken.objects.for_token(old_refresh_token)

    refresh_token_instance = refresh_token_qs.first()
    if refresh_token_instance:
        allow_only_for_self(request, refresh_token_instance.user.username)

    refresh_token_qs.set_revoked()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return 204, None
