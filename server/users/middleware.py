import jwt
from django.contrib.auth import get_user_model
from django.conf import settings
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Récupérer le token depuis les cookies ou les headers
        print(f"JWT Middleware called with scope type: {scope['type']}")
        print(f"Headers: {dict(scope['headers'])}")
        headers = dict(scope["headers"])
        cookies = headers.get(b"cookie", b"").decode("utf-8")
        token = None

        # Extraire le token JWT du cookie (ajustez le nom selon votre système)
        for cookie in cookies.split(";"):
            cookie = cookie.strip()
            if cookie.startswith("access_token="):
                token = cookie[13:]  # 'access_token=' a 13 caractères
                break

        # Si aucun token trouvé dans les cookies, chercher dans les headers. necessaire ?
        if not token and b"authorization" in headers:
            auth_header = headers[b"authorization"].decode("utf-8")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        scope["user"] = None

        if token:
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("user_id")

                if user_id:
                    user = await get_user(user_id)
                    scope["user"] = user
            except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
                pass

        return await super().__call__(scope, receive, send)
