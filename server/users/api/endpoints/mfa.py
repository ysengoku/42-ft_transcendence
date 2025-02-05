import base64
from io import BytesIO
from typing import Any, Dict
import pyotp
import qrcode
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from ninja import Router
from ninja.errors import HttpError

from users.models import mfa, User

mfa_router = Router()


def generate_secret_key() -> str:
    """Generate a random secret key for 2FA"""
    return pyotp.random_base32()


@mfa_router.post("/2fa/setup")
def setup_2fa(request, username: str) -> Dict[str, Any]:
    """Setup 2FA for a user"""
    try:
        user = User.objects.find_by_username(username)
        if not user:
            raise HttpError(404, "User not found")

        secret = generate_secret_key()

        # Check if 2FA already exists
        existing_2fa = mfa.objects.filter(user=user).first()
        if existing_2fa:
            if existing_2fa.is_enabled:
                raise HttpError(400, "2FA is already enabled for this account")
            # Update existing secret
            existing_2fa.secret = secret
            existing_2fa.save()
        else:
            # Create new 2FA entry
            mfa.objects.create(user=user, secret=secret, is_enabled=False)

        # Generate QR code
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(
            name=user.username,
            issuer_name="Transcendence",
        )

        # Create QR code
        qr = qrcode.make(uri)
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "status": "success",
            "message": "2FA setup initiated",
            "instructions": {
                "step1": "Install an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy)",
                "step2": "Open your authenticator app and scan the QR code below",
                "step3": "Enter the 6-digit code from your authenticator app to verify and enable 2FA",
                "manual_entry": "If you can't scan the QR code, manually enter this secret key in your authenticator app",
            },
            "qr_code": qr_base64,
            "secret": secret,
            "requires_verification": True,
        }

    except Exception as e:
        raise HttpError(500, f"Error setting up 2FA: {str(e)}")


@mfa_router.post("/2fa/verify")
def verify_2fa(request, username: str, token: str) -> Dict[str, str]:
    """Verify and enable 2FA for a user"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.find_by_username(username)
        if not user:
            raise HttpError(404, "User not found")

        mfa = mfa.objects.filter(user=user).first()
        if not mfa:
            raise HttpError(404, "Please set up 2FA before verifying")

        totp = pyotp.TOTP(mfa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please try again with a new code from your authenticator app.")

        mfa.is_enabled = True
        mfa.save()

        return {"status": "success", "message": "2FA has been successfully enabled for your account"}

    except ObjectDoesNotExist:
        raise HttpError(404, "User or 2FA configuration not found")
    except Exception as e:
        raise HttpError(500, f"Error verifying 2FA: {str(e)}")


@mfa_router.post("/2fa/verify-login")
def verify_2fa_login(request, username: str, token: str) -> Dict[str, str]:
    """Verify 2FA token during login"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.find_by_username(username)
        if not user:
            raise HttpError(404, "User not found")

        mfa = mfa.objects.filter(user=user).first()
        if not mfa or not mfa.is_enabled:
            raise HttpError(400, "2FA is not enabled for this account")

        totp = pyotp.TOTP(mfa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please try again with a new code from your authenticator app.")

        return {"status": "success", "message": "2FA verification successful"}

    except Exception as e:
        raise HttpError(500, f"Error verifying 2FA: {str(e)}")


@mfa_router.delete("/2fa/disable")
def disable_2fa(request, username: str, token: str) -> Dict[str, str]:
    """Disable 2FA for a user"""
    if not token or len(token) != 6 or not token.isdigit():
        raise HttpError(400, "Invalid token format. Please enter a 6-digit code.")

    try:
        user = User.objects.find_by_username(username)
        if not user:
            raise HttpError(404, "User not found")

        mfa = mfa.objects.filter(user=user).first()
        if not mfa:
            raise HttpError(404, "2FA is not set up for this account")
        if not mfa.is_enabled:
            raise HttpError(400, "2FA is already disabled")

        totp = pyotp.TOTP(mfa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid code. Please enter a valid code from your authenticator app.")

        # Completely delete the 2FA configuration
        mfa.delete()

        return {"status": "success", "message": "2FA has been successfully disabled"}

    except Exception as e:
        raise HttpError(500, f"Error disabling 2FA: {str(e)}")
