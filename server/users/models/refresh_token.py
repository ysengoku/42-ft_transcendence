from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.db import models
from ninja.errors import AuthenticationError


class RefreshTokenManager(models.Manager):
    def create(self, user) -> tuple:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user.username,
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }

        encoded_access_token = jwt.encode(payload, settings.ACCESS_TOKEN_SECRET_KEY, algorithm="HS256")
        payload["exp"] = now + timedelta(days=182)
        encoded_refresh_token = jwt.encode(payload, settings.REFRESH_TOKEN_SECRET_KEY, algorithm="HS256")

        refresh_token = self.model(
            user=user, token=encoded_refresh_token, issued_at=payload["iat"], expires_at=payload["exp"]
        )
        refresh_token.save()
        return encoded_access_token, refresh_token

    def rotate(self, refresh_token_raw: str) -> tuple:
        refresh_token = self.select_related("user").filter(token=refresh_token_raw).first()
        if not refresh_token:
            raise AuthenticationError

        try:
            decoded_refresh_token = self._verify_refresh_token(refresh_token.token)
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationError("Token is expired.") from exc
        except jwt.InvalidSignatureError as exc:
            raise AuthenticationError from exc

        now = datetime.now(timezone.utc)
        if now > refresh_token.expires_at:
            raise AuthenticationError("Token is expired.")
        if refresh_token.is_revoked or refresh_token.user.username != decoded_refresh_token.get("sub"):
            raise AuthenticationError

        refresh_token.is_revoked = True
        refresh_token.save()

        return self.create(refresh_token.user)

    def _verify_jwt(self, token: str, key: str) -> dict:
        """
        May throw `jwt.InvalidSignatureError` or `jwt.ExpiredSignatureError`.
        """
        return jwt.decode(token, key, algorithms=["HS256"])

    def _verify_refresh_token(self, token: str) -> dict:
        return self._verify_jwt(token, settings.REFRESH_TOKEN_SECRET_KEY)

    def verify_access_token(self, token: str) -> dict:
        return self._verify_jwt(token, settings.ACCESS_TOKEN_SECRET_KEY)


class RefreshToken(models.Model):
    user = models.ForeignKey("users.User", related_name="refresh_tokens", on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    issued_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    is_revoked = models.BooleanField(default=False)

    objects = RefreshTokenManager()

    def __str__(self):
        return f"Refresh token of {self.user.username}"
