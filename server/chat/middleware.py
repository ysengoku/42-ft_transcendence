# chat/middleware.py

import logging

from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken

logger = logging.getLogger("server")


class JWTAuthMiddleware:

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = dict(param.split("=") for param in query_string.split(
            "&") if "=" in param).get("token", None)

        if token:
            try:
                auth = JWTAuthentication()
                validated_token = auth.get_validated_token(token)
                user = await database_sync_to_async(auth.get_user)(validated_token)
                scope["user"] = user
            except (InvalidToken, AuthenticationFailed):
                scope["user"] = None
        else:
            scope["user"] = None

        return await self.inner(scope, receive, send)
