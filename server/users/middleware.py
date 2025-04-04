from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from ninja.errors import AuthenticationError

from users.models import Profile
from users.models.refresh_token import RefreshToken

User = get_user_model()


@database_sync_to_async
def authenticate_token(token):
    """
    Authenticate a token using the same logic as your API
    """
    try:
        payload = RefreshToken.objects.verify_access_token(token)
        return User.objects.select_related("profile", "oauth_connection").filter(id=payload["sub"]).first()
    except (AuthenticationError, User.DoesNotExist):
        return None


class JWTAuthMiddleware:
    """
    Authentication middleware for WebSocket connections using JWT tokens.

    This middleware:
    1. Extracts the access token from cookies
    2. Verifies the token using your existing JWT verification logic
    3. Attaches the authenticated user to the scope if valid
    """

    def __init__(self, app):
        # Store the ASGI application we were passed
        self.app = app

    async def __call__(self, scope, receive, send):
        headers = dict(scope["headers"])
        cookies = headers.get(b"cookie", b"").decode(
            "utf-8") if b"cookie" in headers else ""
        token = None
        # user = None
        scope["user"] = None

        for cookie_part in cookies.split(";"):
            cookie_clean = cookie_part.strip()
            if cookie_clean.startswith("access_token="):
                token = cookie_clean[13:]
                break

        if token:
            scope["user"] = await authenticate_token(token)

        return await self.app(scope, receive, send)


class ActivityMiddleware:
    def __call__(self, request):
        response = self.get_response(request)
        if request.user.is_authenticated:
            profile = request.user.profile
            profile.update_activity()

            # Envoi de la mise à jour via WebSocket
            async_to_sync(get_channel_layer().group_send)(
                f"user_{request.user.id}",
                {
                    "type": "user_status",
                    "action": "user_online",
                    "data": {"username": request.user.username}
                }
            )
        return response


class OnlineStatusCleanupMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, scope, receive=None, send=None):
        # Gestion ASGI
        if receive and send:
            return self.handle_asgi(scope, receive, send)
        # Gestion WSGI standard
        return self.handle_wsgi(scope)

    async def handle_asgi(self, scope, receive, send):
        response = await self.get_response(scope, receive, send)
        await self.cleanup_status()
        return response

    def handle_wsgi(self, request):
        response = self.get_response(request)
        self.cleanup_status()
        return response

    def cleanup_status(self):
        from django.db import transaction
        from django.utils import timezone

        from .models import Profile

        with transaction.atomic():
            offline_users = Profile.objects.filter(
                last_activity__lt=timezone.now() - timezone.timedelta(minutes=2),
                is_online=True
            )
            offline_users.update(is_online=False)
