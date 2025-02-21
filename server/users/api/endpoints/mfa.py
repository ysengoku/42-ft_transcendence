import secrets
import string
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from ninja import Router
from ninja.errors import HttpError

from users.api.endpoints.auth import _create_json_response_with_tokens
from users.models import User

mfa_router = Router()

TOKEN_LENGTH = 6
TOKEN_EXPIRY = 10 * 60


def generate_verification_code() -> str:
    """Generate a random 6-digit verification code"""
    return "".join(secrets.choice(string.digits) for _ in range(TOKEN_LENGTH))


def get_cache_key(username: str) -> str:
    """Create a unique cache key for storing the verification code"""
    return f"mfa_email_code_{username}"


@mfa_router.post("/send-code", auth=None, response={200: dict, 404: dict, 500: dict})
@ensure_csrf_cookie
def send_verification_code(request, username: str) -> dict[str, Any]:
    """Send a verification code to the user's email"""
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        verification_code = generate_verification_code()

        try:
            send_mail(
                subject="Your Verification Code",
                message=f"Your verification code is: {verification_code}\nThis code will expire in 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            raise HttpError(500, "Failed to send verification code") from e

        cache_key = get_cache_key(username)
        cache.set(cache_key, verification_code, TOKEN_EXPIRY)

        return JsonResponse(
            {
                "status": "success",
                "message": "Verification code sent to user email",
            },
        )

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error sending verification code: {str(e)}") from e


@mfa_router.post("/verify-login", auth=None)
@ensure_csrf_cookie
def verify_email_login(request, username: str, token: str) -> dict[str, Any]:
    """Verify email verification code during login"""
    if not token or len(token) != TOKEN_LENGTH or not token.isdigit():
        raise HttpError(400, "Invalid code format. Please enter a 6-digit code.")

    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        cache_key = get_cache_key(username)
        stored_code = cache.get(cache_key)

        if not stored_code:
            raise HttpError(400, "Verification code has expired. Please request a new code.")

        if token != stored_code:
            raise HttpError(400, "Invalid verification code. Please try again.")

        cache.delete(cache_key)

        response_data = user.profile.to_profile_minimal_schema()
        return _create_json_response_with_tokens(user, response_data)

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error verifying code: {str(e)}") from e
