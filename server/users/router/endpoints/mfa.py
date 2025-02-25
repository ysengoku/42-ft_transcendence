import secrets
import string
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from ninja import Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from users.models import User
from users.router.utils import _create_json_response_with_tokens
from users.schemas import SendMfaCode

mfa_router = Router()

TOKEN_LENGTH = 6
TOKEN_EXPIRY = 10 * 60


def generate_verification_code() -> str:
    """Generate a random 6-digit verification code"""
    return "".join(secrets.choice(string.digits) for _ in range(TOKEN_LENGTH))


def get_cache_key(username: str) -> str:
    """Create a unique cache key for storing the verification code"""
    return f"mfa_email_code_{username}"


@mfa_router.post("/resend-code", auth=None, response={200: MessageSchema, 404: MessageSchema})
@ensure_csrf_cookie
def resend_verification_code(request, username: str) -> dict[str, any]:
    user = User.objects.filter(username=username).first()
    if not user:
        raise HttpError(404, "User with that email not found")

    if handle_mfa_code(user):
        return JsonResponse(
            {
                "msg": "Verification code sent to user email",
            },
        )
    return None


def handle_mfa_code(user):
    """Send a verification code to the user's email"""
    user = User.objects.filter(username=user.username).first()
    if not user:
        raise HttpError(404, "User with that email not found")

    verification_code = generate_verification_code()
    user.mfa_token = verification_code
    user.mfa_token_date = datetime.now(timezone.utc)
    user.save()

    return send_mail(
        subject="Your Verification Code",
        message=f"Your verification code is: {verification_code}\nThis code will expire in 10 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


@mfa_router.post(
    "/verify-mfa",
    auth=None,
    response={200: MessageSchema, 404: MessageSchema, 408: MessageSchema, 401: MessageSchema},
)
@ensure_csrf_cookie
def verify_mfa_code(request, username: str, data: SendMfaCode) -> dict[str, any]:
    """Verify verification code received by email during login"""
    user = User.objects.filter(username=username).first()
    if not user:
        raise HttpError(404, "User not found")

    if not data.token or len(data.token) != TOKEN_LENGTH or not data.token.isdigit():
        raise HttpError(400, "Invalid code format. Please enter a 6-digit code.")

    now = datetime.now(timezone.utc)
    if user.mfa_token_date + timedelta(seconds=TOKEN_EXPIRY) < now:
        raise HttpError(408, "Expired session: authentication request timed out")

    if data.token != user.mfa_token:
        raise HttpError(401, "Invalid verification code")

    response_data = user.profile.to_profile_minimal_schema()
    return _create_json_response_with_tokens(user, response_data)
