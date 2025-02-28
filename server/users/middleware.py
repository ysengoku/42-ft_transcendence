from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model

from users.models.refresh_token import RefreshToken

User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    """
    Convert a synchronous database query to an asynchronous operation.
    """
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
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
        cookies = headers.get(b"cookie", b"").decode("utf-8")
        token = None

        for cookie_part in cookies.split(";"):
            cookie_clean = cookie_part.strip()
            if cookie_clean.startswith("access_token="):
                token = cookie_clean[13:]
                break

        scope["user"] = None

        if token:
            payload = await database_sync_to_async(RefreshToken.objects.verify_access_token)(token)
            user_id = payload.get("user_id")

            if user_id:
                user = await get_user(user_id)
                scope["user"] = user
            else:
                scope["user"] = None


        return await super().__call__(scope, receive, send)
