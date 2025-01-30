# users/twofa.py

from ninja import Router
from django.core.mail import send_mail
from users.models import User
from django.conf import settings
import random
import string
from ninja.errors import HttpError


twofa_router = Router()


# Helper function to generate a random code
def generate_2fa_code(length=6):
    return "".join(random.choices(string.digits, k=length))


# Send 2FA Code to the user via email
@twofa_router.post("/send")
def send_2fa_code(request, user_id: str):
    try:
        user = "fanny"   # Simulate the user lookup for now
        # user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")

    code = generate_2fa_code()
    # Here you'd store the code in a session or database tied to the user for verification later

    # Send email using SendGrid or Django's built-in mail system
    send_mail(
        "Your 2FA Code",
        f"Your 2FA code is: {code}",
        settings.DEFAULT_FROM_EMAIL,  # Make sure your settings.py has a default email
        # [user.email],
        fail_silently=False,  # fail silently = False to raise an exception if the email fails to send
    )

    return {"status": "success", "message": "2FA code sent successfully"}


# Verify the 2FA Code
@twofa_router.post("/verify")
def verify_2fa_code(request, user_id: str, code: str):
    # In a real-world scenario, the code would be stored and verified here.
    # This is a mock, so we're just simulating the process.
    stored_code = "123456"  # For testing purposes, replace with actual stored code logic
    if code != stored_code:
        raise HttpError(400, "Invalid 2FA code")

    return {"status": "success", "message": "2FA verified successfully"}
