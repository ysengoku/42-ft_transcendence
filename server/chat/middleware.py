# chat/middleware.py

import logging

from channels.auth import AuthMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication

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
            except Exception as e:
                scope["user"] = None
        else:
            scope["user"] = None

        return await self.inner(scope, receive, send)
