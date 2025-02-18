from base64 import b64encode
from io import BytesIO
from typing import Any, Dict

import pyotp
import qrcode
from django.core.exceptions import ObjectDoesNotExist
from ninja import Router
from ninja.errors import HttpError

from server.users.api.endpoints.auth import _create_json_response_with_tokens
from users.models import User

mfa_router = Router()


def generate_secret_key() -> str:
    """Generate a random secret key for MFA"""
    return pyotp.random_base32()


def generate_qr_code(uri: str) -> str:
    """Generate a QR code image and return it as a base64 string"""
    qr = qrcode.make(uri)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    return b64encode(buffer.getvalue()).decode("utf-8")


@mfa_router.post("/setup")
def setup_mfa(request, username: str) -> Dict[str, Any]:
    """Setup MFA for a user"""
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        # Don't allow re-enabling if already enabled
        if user.mfa_enabled:
            raise HttpError(400, "MFA is already enabled for this account")

        # Generate new secret
        secret = generate_secret_key()
        user.mfa_secret = secret
        user.save()

        # Generate QR code
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.username, issuer_name="Transcendence")
        qr_code = generate_qr_code(uri)

        return {
            "status": "success",
            "message": "MFA setup initiated",
            "instructions": {
                "step1": "Install an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy)",
                "step2": "Open your authenticator app and scan the QR code below",
                "step3": "Enter the 6-digit code from your authenticator app to verify and enable MFA",
                "manual_entry": "If you can't scan the QR code, manually enter this secret key in your authenticator app",
            },
            "qr_code": qr_code,
            "secret": secret,
        }

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error setting up MFA: {str(e)}")


@mfa_router.post("/verify")
def verify_mfa(request, username: str, token: str) -> Dict[str, str]:
    """Verify and enable MFA for a user"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        if not user.mfa_secret:
            raise HttpError(404, "Please set up MFA before verifying")

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please try again with a new code from your authenticator app.")

        user.mfa_enabled = True
        user.save()

        return {"status": "success", "message": "MFA has been successfully enabled for your account"}

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error verifying MFA: {str(e)}")


@mfa_router.post("/verify-login")
def verify_mfa_login(request, username: str, token: str) -> Dict[str, Any]:
    """Verify MFA token during login"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        if not user.mfa_enabled:
            raise HttpError(400, "MFA is not enabled for this account")

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please try again with a new code from your authenticator app.")

        # MFA vérifié, on crée maintenant les tokens
        response_data = user.profile.to_profile_minimal_schema()
        return _create_json_response_with_tokens(user, response_data)

    except Exception as e:
        raise HttpError(500, f"Error verifying MFA: {str(e)}")


@mfa_router.delete("/disable")
def disable_mfa(request, username: str, token: str) -> Dict[str, str]:
    """Disable MFA for a user"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        if not user.mfa_enabled:
            raise HttpError(400, "MFA is already disabled")

        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please enter a valid code from your authenticator app.")

        # Disable MFA
        user.mfa_enabled = False
        user.mfa_secret = ""  # Clear the secret
        user.save()

        return {"status": "success", "message": "MFA has been successfully disabled"}

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error disabling MFA: {str(e)}")


@mfa_router.get("/status")
def mfa_status(request, username: str) -> Dict[str, bool]:
    """Check if MFA is enabled for a user"""
    try:
        user = User.objects.filter(username=username).first()
        if not user:
            raise HttpError(404, "User not found")

        return {"enabled": user.mfa_enabled}

    except HttpError as e:
        raise e
    except Exception as e:
        raise HttpError(500, f"Error checking MFA status: {str(e)}")
