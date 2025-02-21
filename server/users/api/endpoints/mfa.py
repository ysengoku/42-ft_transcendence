from base64 import b64encode
from io import BytesIO
import random
import string
from typing import Any, Dict
from datetime import datetime, timedelta

from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from ninja import Router
from ninja.errors import HttpError
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from users.api.endpoints.auth import _create_json_response_with_tokens
from users.models import User

mfa_router = Router()

TOKEN_LENGTH = 6
TOKEN_EXPIRY = 10 * 60  # 10 minutes en secondes


def generate_verification_code() -> str:
    """Generate a random 6-digit verification code"""
    return "".join(random.choices(string.digits, k=TOKEN_LENGTH))


def get_cache_key(username: str) -> str:
    """Create a unique cache key for storing the verification code"""
    return f"mfa_email_code_{username}"


@mfa_router.post("/send-code")
@ensure_csrf_cookie
def send_verification_code(request, username: str) -> dict[str, Any]:
    """Send a verification code to the user's email (simulated in console)"""
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        # Générer un code de vérification
        verification_code = generate_verification_code()

        # Stocker le code dans le cache avec une date d'expiration
        cache_key = get_cache_key(username)
        cache.set(cache_key, verification_code, TOKEN_EXPIRY)

        # En développement, on affiche le code dans la console
        print("=" * 50)
        print(f"VERIFICATION CODE for {username}: {verification_code}")
        print("=" * 50)

        return {
            "status": "success",
            "message": "Verification code sent (check console)",
            "debug_code": verification_code,  # Inclure le code en réponse pour faciliter les tests
        }

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error sending verification code: {str(e)}")


@mfa_router.post("/verify-login")
@ensure_csrf_cookie
def verify_email_login(request, username: str, token: str) -> dict[str, Any]:
    """Verify email verification code during login"""
    if not token or len(token) != TOKEN_LENGTH or not token.isdigit():
        raise HttpError(400, "Invalid code format. Please enter a 6-digit code.")

    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        # Récupérer le code stocké dans le cache
        cache_key = get_cache_key(username)
        stored_code = cache.get(cache_key)

        if not stored_code:
            raise HttpError(400, "Verification code has expired. Please request a new code.")

        if token != stored_code:
            raise HttpError(400, "Invalid verification code. Please try again.")

        # Supprimer le code du cache après utilisation
        cache.delete(cache_key)

        # Code vérifié, on crée maintenant les tokens
        response_data = user.profile.to_profile_minimal_schema()
        return _create_json_response_with_tokens(user, response_data)

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error verifying code: {str(e)}")


@mfa_router.get("/status")
@ensure_csrf_cookie
def mfa_status(request, username: str) -> dict[str, bool]:
    """Check if user exists and can receive verification codes"""
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        # En mode développement, on suppose que tous les utilisateurs peuvent recevoir des codes
        return {"enabled": True}

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error checking status: {str(e)}")
