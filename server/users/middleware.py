from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from users.models.refresh_token import RefreshToken

User = get_user_model()


@database_sync_to_async
def authenticate_token(token):
    """
    Authenticate a token using the same logic as your API
    """
    try:
        payload = RefreshToken.objects.verify_access_token(token)
        user = User.objects.filter(id=payload["sub"]).first()
        return user
    except Exception:
        return None


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authentication middleware for WebSocket connections using JWT tokens.

    This middleware:
    1. Extracts the access token from cookies
    2. Verifies the token using your existing JWT verification logic
    3. Attaches the authenticated user to the scope if valid
    """

    async def __call__(self, scope, receive, send):
        headers = dict(scope["headers"])
        cookies = headers.get(b"cookie", b"").decode("utf-8") if b"cookie" in headers else ""
        scope["user"] = AnonymousUser()
        token = None

        for cookie_part in cookies.split(";"):
            cookie_clean = cookie_part.strip()
            if cookie_clean.startswith("access_token="):
                token = cookie_clean[13:]
                break

        print(token)

        if token:
            user = await authenticate_token(token)
            if user:
                scope["user"] = user
                print(f"Authenticated as {user.username}")
            else:
                print("Authentication failed")

        return await super().__call__(scope, receive, send)
