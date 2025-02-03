from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings


def create_jwt(username: str, key: str, td: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + td,
    }
    return jwt.encode(payload, key, algorithm="HS256")


def verify_jwt(token: str, key: str) -> dict | None:
    return jwt.decode(token, key, algorithms=["HS256"])

def create_access_token(username: str):
    return create_jwt(username, settings.ACCESS_TOKEN_SECRET_KEY, timedelta(minutes=30))

def verify_access_token(token: str):
    return verify_jwt(token, settings.ACCESS_TOKEN_SECRET_KEY)

def create_refresh_token(username: str):
    return create_jwt(username, settings.REFRESH_TOKEN_REFRESH_SECRET_KEY, timedelta(days=182))

def verify_refresh_token(token: str):
     return verify_jwt(token, settings.REFRESH_TOKEN_REFRESH_SECRET_KEY)
