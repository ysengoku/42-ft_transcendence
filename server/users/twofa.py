# users/twofa.py

from ninja import Router
from django.core.mail import send_mail
from users.models import User
from django.conf import settings
import random
import string
from ninja.errors import HttpError
import pyotp
import qrcode
import base64
from io import BytesIO
from .models import TwoFactorAuth


twofa_router = Router()


def generate_secret_key():
    return pyotp.random_base32()

@twofa_router.post("/2fa/setup")
def setup_2fa(request, user_id: str): # pk request ? expliquer
    user = User.objects.get(id=user_id) # remplacer par fanny
    secret = generate_secret_key()

    TwoFactorAuth.objects.create(user=user, defaults={"secret": secret, "is enabled": False})

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.username, issuer_name="Transcendence")

    qr = qrcode.make(uri)
    buffer = BytesIO()
    qr.save(buffer, "PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {"qr_code": qr_base64, "secret": secret} # retourne secret ? cest pas safe

def verify_2fa(request, user_id: int, token: str): # pk id ici et str plus haut 
    user = User.objects.get(id=user_id)
    twofa = TwoFactorAuth.objects.get(user=user) # je vois pas enquoi on repere le secret ?

    totp = pyotp.TOTP(twofa.secret)
    if not totp.verify(token):
        raise HttpError(400, "Invalid 2FA token") # oas besoin de return ici  ?
    else:
        twofa.is_enabled = True
        twofa.save()
        return {"status": "success", "message": "2FA enabled successfully"}
    

def login_2fa(request, user_id: int, password: str, token: str):
    user = User.objects.get(id=user_id)

    if not user.check_password(password):
        raise HttpError(400, "Invalid password")

    totp = pyotp.TOTP(twofa.secret)
    if not totp.verify(token):
        raise HttpError(400, "Invalid 2FA token")

    return {"status": "success", "message": "Login successful"}

##############################################################


# Send 2FA Code to the user via email

# @twofa_router.post("/send")
# def send_2fa_code(request, user_id: str):
#     try:
#         user = "fanny"   # Simulate the user lookup for now
#         # user = User.objects.get(id=user_id)
#     except User.DoesNotExist:
#         raise HttpError(404, "User not found")

#     code = generate_2fa_code()
#     # Here you'd store the code in a session or database tied to the user for verification later

#     # Send email using SendGrid or Django's built-in mail system
#     send_mail(
#         "Your 2FA Code",
#         f"Your 2FA code is: {code}",
#         settings.DEFAULT_FROM_EMAIL,  # Make sure your settings.py has a default email
#         # [user.email],
#         fail_silently=False,  # fail silently = False to raise an exception if the email fails to send
#     )

#     return {"status": "success", "message": "2FA code sent successfully"}


# # Verify the 2FA Code
# @twofa_router.post("/verify")
# def verify_2fa_code(request, user_id: str, code: str):
#     # In a real-world scenario, the code would be stored and verified here.
#     # This is a mock, so we're just simulating the process.
#     stored_code = "123456"  # For testing purposes, replace with actual stored code logic
#     if code != stored_code:
#         raise HttpError(400, "Invalid 2FA code")

#     return {"status": "success", "message": "2FA verified successfully"}
