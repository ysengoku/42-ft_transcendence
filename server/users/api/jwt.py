from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings


def create_jwt(username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + timedelta(minutes=30),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def verify_jwt(token: str) -> dict | None:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
