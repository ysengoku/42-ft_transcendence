from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.db import models
from ninja.errors import AuthenticationError


# TODO: tweak access and refresh tokens lifetime
class RefreshTokenQuerySet(models.QuerySet):
    """
    Manages access and refresh JWT's. Handles PyJWT exceptions and throws AuthenticationError in case of any JWT error.
    """

    def for_token(self, token: str):
        return self.filter(token=token)

    def set_revoked(self):
        return self.update(is_revoked=True)

    def create(self, user, old_refresh_token_instance=None) -> tuple:
        """
        Creates a new refresh token.
        To avoid collisions, if old refresh token is identical to the new one, deletes the old refresh token.
        """
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "iat": now,
            "exp": now + timedelta(seconds=10),
        }

        access_token = jwt.encode(payload, settings.ACCESS_TOKEN_SECRET_KEY, algorithm="HS256")
        payload["exp"] = now + timedelta(minutes=2)
        refresh_token = jwt.encode(payload, settings.REFRESH_TOKEN_SECRET_KEY, algorithm="HS256")

        refresh_token_instance = self.model(
            user=user,
            token=refresh_token,
        )

        if not old_refresh_token_instance:
            old_refresh_token_instance = self.filter(token=refresh_token_instance.token).first()

        if old_refresh_token_instance and old_refresh_token_instance.token == refresh_token_instance.token:
            old_refresh_token_instance.delete()

        refresh_token_instance.save()
        return access_token, refresh_token_instance

    def rotate(self, refresh_token_raw: str) -> tuple:
        refresh_token_instance = self.select_related("user").filter(token=refresh_token_raw).first()
        if not refresh_token_instance:
            raise AuthenticationError

        decoded_refresh_token = self._verify_refresh_token(refresh_token_instance.token)

        if refresh_token_instance.is_revoked or str(refresh_token_instance.user.id) != decoded_refresh_token.get(
            "sub",
        ):
            raise AuthenticationError

        refresh_token_instance.is_revoked = True
        refresh_token_instance.save()

        return self.create(refresh_token_instance.user, refresh_token_instance)

    def _verify_jwt(self, token: str, key: str) -> dict:
        try:
            return jwt.decode(token, key, algorithms=["HS256"])
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationError("Session is expired. Please login again.") from exc
        except jwt.PyJWTError as exc:
            raise AuthenticationError from exc

    def _verify_refresh_token(self, token: str) -> dict:
        return self._verify_jwt(token, settings.REFRESH_TOKEN_SECRET_KEY)

    def verify_access_token(self, token: str) -> dict:
        return self._verify_jwt(token, settings.ACCESS_TOKEN_SECRET_KEY)


class RefreshToken(models.Model):
    user = models.ForeignKey("users.User", related_name="refresh_tokens", on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    is_revoked = models.BooleanField(default=False)

    objects = RefreshTokenQuerySet.as_manager()

    def __str__(self):
        return f"Refresh token of {self.user.username}"
