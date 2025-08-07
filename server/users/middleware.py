import logging

from channels.db import database_sync_to_async
from ninja.errors import AuthenticationError
from ninja.security import APIKeyCookie

from users.models import RefreshToken, User

logger = logging.getLogger("server")

ILLEGAL_CONNECTION = 3002

class JWTEndpointsAuthMiddleware(APIKeyCookie):
    """
    Middleware for the API endpoints authentication through JWT.
    Populates `request.auth` parameter of API requests with either `User` instance or `None`.
    """

    param_name = "access_token"

    def authenticate(self, request, access_token: str):
        payload = RefreshToken.objects.select_related("profile").verify_access_token(access_token)

        user = User.objects.for_id(payload["sub"]).first()
        if user is None:
            return None

        user.profile.update_activity()
        return user


class JWTWebsocketAuthMiddleware:
    """
    Middleware for the websocket authentication through JWT.
    Populates `scope.user` attribute of websocket consumers with either `User` instance or `None`.
    """

    def __init__(self, app):
        self.app = app  # ASGI app

    async def __call__(self, scope, receive, send):
        headers = dict(scope["headers"])
        cookies = headers.get(b"cookie", b"").decode("utf-8") if b"cookie" in headers else ""
        token = None
        scope["user"] = None

        for cookie_part in cookies.split(";"):
            cookie_clean = cookie_part.strip()
            if cookie_clean.startswith("access_token="):
                token = cookie_clean[13:]
                break

        if token:
            scope["user"] = await self.authenticate_token(token)
        try:
            return await self.app(scope, receive, send)
        except ValueError as e:
            logger.warning("WS not open for scope user %s : %s", scope["user"], e)
            await send({"type": "websocket.accept"})
            await send({"type": "websocket.close", "code": ILLEGAL_CONNECTION})

    @database_sync_to_async
    def authenticate_token(self, token):
        try:
            payload = RefreshToken.objects.verify_access_token(token)
            return User.objects.select_related("profile", "oauth_connection").filter(id=payload["sub"]).first()
        except (AuthenticationError, User.DoesNotExist):
            return None
