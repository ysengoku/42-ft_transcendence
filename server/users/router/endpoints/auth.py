import hashlib
import os
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router
from ninja.errors import AuthenticationError, HttpError

from common.routers import allow_only_for_self
from common.schemas import MessageSchema
from users.models import RefreshToken, User
from users.router.endpoints.mfa import handle_mfa_code
from users.router.utils import _create_json_response_with_tokens
from users.schemas import (ForgotPasswordSchema, LoginResponseSchema,
                           LoginSchema, PasswordValidationSchema,
                           ProfileMinimalSchema, SignUpSchema,
                           ValidationErrorMessageSchema)

auth_router = Router()

TOKEN_EXPIRY = 10


@auth_router.get("self", response={200: ProfileMinimalSchema, 401: MessageSchema})
def check_self(request: HttpRequest):
    """
    Checks authentication status of the user.
    If the user has valid access token, returns minimal information of user's profile.
    """
    return request.auth.profile


@auth_router.post(
    "login",
    response={200: ProfileMinimalSchema | LoginResponseSchema,
              401: MessageSchema, 429: MessageSchema},
    auth=None,
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
    if is_mfa_enabled and handle_mfa_code(user):
        return JsonResponse(
            {
                "mfa_required": True,
                "username": user.username,
            },
        )
    if is_mfa_enabled:
        raise HttpError(503, "Failed to send MFA code")
    response_data = user.profile.to_profile_minimal_schema()
    return _create_json_response_with_tokens(user, response_data)


@auth_router.post(
    "signup",
    response={201: ProfileMinimalSchema,
              422: list[ValidationErrorMessageSchema]},
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
    response={204: None, 401: MessageSchema},
    auth=None,
)
def refresh(request: HttpRequest, response: HttpResponse):
    """
    Rotates the refresh token. Issues a new refresh token and a new access token.
    """
    old_refresh_token = request.COOKIES.get("refresh_token")
    if not old_refresh_token:
        raise AuthenticationError

    new_access_token, new_refresh_token_instance = RefreshToken.objects.rotate(
        old_refresh_token)

    response.set_cookie("access_token", new_access_token)
    response.set_cookie("refresh_token", new_refresh_token_instance.token)
    return 204, None


@auth_router.delete(
    "logout",
    response={204: None, 401: MessageSchema},
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


@auth_router.delete("/users/{username}/delete",
                    response={200: MessageSchema, frozenset({401, 403, 404}): MessageSchema})
def delete_account(request, username: str, response: HttpResponse):
    """
    Delete definitely the user account and the associated profile, including friends relations and avatar.
    """
    user = request.auth
    if not user:
        return None

    if user.username != username:
        raise HttpError(403, "You are not allowed to delete this account.")

    old_refresh_token = request.COOKIES.get("refresh_token")
    if old_refresh_token:
        refresh_token_qs = RefreshToken.objects.for_token(old_refresh_token)
        refresh_token_qs.set_revoked()

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    user.delete()

    return {"msg": "Account successfully deleted."}


@auth_router.post("/forgot-password", response={200: MessageSchema}, auth=None)
@csrf_exempt
def request_password_reset(request, data: ForgotPasswordSchema) -> dict[str, any]:
    """Request a password reset link"""
    user = User.objects.for_username_or_email(data.email).first()

    if not user:
        return {"msg": "Password reset instructions sent to your email if email exists."}

    token = hashlib.sha256(os.urandom(32)).hexdigest()
    user.forgot_password_token = token
    user.forgot_password_token_date = datetime.now(timezone.utc)
    user.save()

    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

    send_mail(
        subject="Password Reset Request",
        message=f"Click this link to reset your password: {reset_url}\nThis link will expire in 10 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return {
        "msg": "Password reset instructions sent to your email",
    }


@auth_router.post(
    "/reset-password/{token}",
    response={200: MessageSchema, 400: MessageSchema,
              422: list[ValidationErrorMessageSchema]},
    auth=None,
)
@csrf_exempt
def reset_password(request, token: str, data: PasswordValidationSchema) -> dict[str, any]:
    """Reset user password using token from URL and new password from body"""
    user = User.objects.for_forgot_password_token(token=token).first()
    if not user:
        raise AuthenticationError

    now = datetime.now(timezone.utc)
    if user.forgot_password_token_date + timedelta(minutes=TOKEN_EXPIRY) < now:
        user.forgot_password_token = ""
        user.forgot_password_token_date = None
        user.save()
        raise HttpError(
            408, "Expired session: authentication request timed out")

    obj = PasswordValidationSchema(
        username=user.username,
        password=data.password,
        password_repeat=data.password_repeat,
    )

    err_dict = obj.validate_password()
    if err_dict:
        raise HttpError(422, err_dict)

    user.set_password(data.password)
    user.forgot_password_token = ""
    user.forgot_password_token_date = None
    user.save()

    return {"msg": "Password has been reset successfully"}
