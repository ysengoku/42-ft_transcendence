import hashlib
import os

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.mail import send_mail
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Form, Router
from ninja.errors import AuthenticationError, HttpError

from users.api.common import allow_only_for_self
from users.models import RefreshToken, User
from users.schemas import (
    ForgotPasswordSchema,
    LoginResponseSchema,
    LoginSchema,
    Message,
    ProfileMinimalSchema,
    ResetPasswordSchema,
    SignUpSchema,
    UpdateUserChema,
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

    response = HttpResponseRedirect(settings.HOME_REDIRECT_URL)
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


@auth_router.post(
    "login", response={200: ProfileMinimalSchema | LoginResponseSchema, 401: Message, 429: Message}, auth=None
)
@ensure_csrf_cookie
@csrf_exempt
def login(request: HttpRequest, credentials: LoginSchema):
    """
    Logs in user. Can login by username, email or username.
    """
    user = User.objects.for_username_or_email(credentials.username).first()
    if not user or user.get_oauth_connection():
        raise HttpError(401, "Username or password are not correct.")

    is_password_correct = user.check_password(credentials.password)
    if not is_password_correct:
        raise HttpError(401, "Username or password are not correct.")

    is_mfa_enabled = User.objects.has_mfa_enabled(credentials.username)
    if is_mfa_enabled:
        return JsonResponse(
            {
                "mfa_required": True,
                "username": user.username,
            },
        )
    response_data = user.profile.to_profile_minimal_schema()
    return _create_json_response_with_tokens(user, response_data)


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


@auth_router.post("/forgot-password", response={200: Message}, auth=None)
@csrf_exempt
def request_password_reset(request, data: ForgotPasswordSchema) -> dict[str, any]:
    """Request a password reset link"""
    user = User.objects.for_username_or_email(data.email).first()

    if not user:
        return {"msg": "Password reset instructions sent to your email if email exists."}

    token = hashlib.sha256(os.urandom(32)).hexdigest()
    cache_key = f"password_reset_{token}"
    cache.set(cache_key, str(user.id), timeout=3600)

    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

    send_mail(
        subject="Password Reset Request",
        message=f"Click this link to reset your password: {reset_url}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return {
        "msg": "Password reset instructions sent to your email",
    }


@auth_router.post(
    "/reset-password/{token}/", response={200: dict, 400: dict, 422: list[ValidationErrorMessageSchema]}, auth=None
)
@csrf_exempt
def reset_password(request, token: str, data: Form[ResetPasswordSchema]) -> dict[str, any]:
    """Reset user password using token from URL and new password from body"""
    cache_key = f"password_reset_{token}"
    user_id = cache.get(cache_key)
    if not user_id:
        raise HttpError(400, "Invalid or expired token")

    user = User.objects.for_id(user_id).first()
    if not user:
        raise AuthenticationError

    update_data = UpdateUserChema(
        password=data.password,
        password_repeat=data.password_repeat,
    )

    try:
        user.update_user(update_data, None)

        cache.delete(cache_key)

        return JsonResponse({"status": "success", "message": "Password has been reset successfully"})

    except ValidationError as exc:
        raise HttpError(422, exc.error_dict) from exc
    except PermissionDenied as exc:
        raise HttpError(400, "Invalid password reset request") from exc
