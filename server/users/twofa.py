from ninja import Router
from ninja.errors import HttpError
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
import pyotp
import qrcode
import base64
from io import BytesIO
from typing import Dict

from .models import User, TwoFactorAuth

twofa_router = Router()

def generate_secret_key() -> str:
    """Generate a random secret key for 2FA"""
    return pyotp.random_base32()

@twofa_router.post("/2fa/setup")
def setup_2fa(request, slug_id: str) -> Dict[str, str]:
    """Setup 2FA for a user"""
    try:
        user = User.objects.find_by_slug_id(slug_id)
        if not user:
            raise HttpError(404, "User not found")

        # Check if 2FA already exists
        existing_2fa = TwoFactorAuth.objects.filter(user=user).first()
        if existing_2fa:
            if existing_2fa.is_enabled:
                raise HttpError(400, "2FA is already enabled")
            # If exists but not enabled, update the secret
            secret = generate_secret_key()
            existing_2fa.secret = secret
            existing_2fa.save()
        else:
            # Create new 2FA entry
            secret = generate_secret_key()
            TwoFactorAuth.objects.create(
                user=user,
                secret=secret,
                is_enabled=False
            )

        # Generate QR code
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(
            name=user.username,
            issuer_name="Transcendence"
        )

        # Create QR code
        qr = qrcode.make(uri)
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "status": "success",
            "qr_code": qr_base64,
            "secret": secret  # Send secret for manual entry if needed
        }

    except Exception as e:
        raise HttpError(500, str(e))

@twofa_router.post("/2fa/verify")
def verify_2fa(request, slug_id: str, token: str) -> Dict[str, str]:
    """Verify and enable 2FA for a user"""
    try:
        user = User.objects.find_by_slug_id(slug_id)
        if not user:
            raise HttpError(404, "User not found")

        twofa = TwoFactorAuth.objects.filter(user=user).first()
        if not twofa:
            raise HttpError(404, "2FA not setup for this user")

        totp = pyotp.TOTP(twofa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid 2FA token")

        twofa.is_enabled = True
        twofa.save()

        return {
            "status": "success",
            "message": "2FA enabled successfully"
        }

    except ObjectDoesNotExist:
        raise HttpError(404, "User or 2FA configuration not found")
    except Exception as e:
        raise HttpError(500, str(e))

@twofa_router.post("/2fa/verify-login")
def verify_2fa_login(request, slug_id: str, token: str) -> Dict[str, str]:
    """Verify 2FA token during login"""
    try:
        user = User.objects.find_by_slug_id(slug_id)
        if not user:
            raise HttpError(404, "User not found")

        twofa = TwoFactorAuth.objects.filter(user=user).first()
        if not twofa or not twofa.is_enabled:
            raise HttpError(400, "2FA is not enabled for this user")

        totp = pyotp.TOTP(twofa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid 2FA token")

        return {
            "status": "success",
            "message": "2FA verification successful"
        }

    except ObjectDoesNotExist:
        raise HttpError(404, "User or 2FA configuration not found")
    except Exception as e:
        raise HttpError(500, str(e))

@twofa_router.delete("/2fa/disable")
def disable_2fa(request, slug_id: str, token: str) -> Dict[str, str]:
    """Disable 2FA for a user"""
    try:
        user = User.objects.find_by_slug_id(slug_id)
        if not user:
            raise HttpError(404, "User not found")

        twofa = TwoFactorAuth.objects.filter(user=user).first()
        if not twofa:
            raise HttpError(404, "2FA not setup for this user")
        if not twofa.is_enabled:
            raise HttpError(400, "2FA is already disabled")

        # Verify token before disabling
        totp = pyotp.TOTP(twofa.secret)
        if not totp.verify(token):
            raise HttpError(400, "Invalid 2FA token")

        # Option 1: Completely delete the 2FA configuration
        twofa.delete()
        
        # Option 2: Just disable it (uncomment if you prefer this)
        # twofa.is_enabled = False
        # twofa.save()

        return {
            "status": "success",
            "message": "2FA disabled successfully"
        }

    except ObjectDoesNotExist:
        raise HttpError(404, "User or 2FA configuration not found")
    except Exception as e:
        raise HttpError(500, str(e))