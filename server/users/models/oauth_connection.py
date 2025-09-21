import logging
from datetime import timedelta
from io import BytesIO

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import DatabaseError, models
from django.utils import timezone

logger = logging.getLogger("server")

# OAuth configuration constants
OAUTH_API_HEALTH_CHECK_TIMEOUT = 2.0  # seconds
OAUTH_TOKEN_REQUEST_TIMEOUT = 10  # seconds
OAUTH_USER_INFO_TIMEOUT = 10  # seconds
OAUTH_AVATAR_DOWNLOAD_TIMEOUT = 5  # seconds
OAUTH_STATE_EXPIRY_MINUTES = 5  # minutes


class OauthConnectionManager(models.Manager):
    """
    Custom manager for handling OAuth connections.
    """

    def for_state_and_pending_status(self, state: str):
        return self.filter(status=self.model.PENDING, state=state)

    def create_pending_connection(self, state: str, platform: str):
        """
        Persists a pending OAuth connection with a random 'state' value.
        Used for CSRF protection regarding third party services: ensures the state received at callback
        matches a valid, non-expired OAuth attempt initiated by our app.
        """
        return OauthConnection.objects.create(
            state=state,
            connection_type=platform,
            status=OauthConnection.PENDING,
        )


class OauthConnection(models.Model):
    """
    Represents OAuth connection state of a specific user.
    Stores all of the data required to connect user using OAuth: type of the platform, id, status and state.
    """

    FT = "42"
    GITHUB = "github"
    REGULAR = "regular"

    CONNECTION_TYPES_CHOICES = (
        (FT, "42 School API"),
        (GITHUB, "Github API"),
        (REGULAR, "Our Own Auth"),
    )

    PENDING = "pending"
    CONNECTED = "connected"
    USED = "used"
    STATUS_CHOICES = ((PENDING, "Pending"), (CONNECTED, "Connected"), (USED, "Used"))

    state = models.CharField(max_length=64, editable=False)
    status = models.CharField(max_length=9, editable=False, choices=STATUS_CHOICES)
    connection_type = models.CharField(max_length=7, choices=CONNECTION_TYPES_CHOICES)
    oauth_id = models.IntegerField(blank=True, null=True)
    user = models.OneToOneField(
        "users.User",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
        related_name="oauth_connection",
    )
    date = models.DateTimeField(default=timezone.now)

    objects = OauthConnectionManager()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        username = self.user.username if self.user else "No User"
        connection_type = self.connection_type if self.connection_type else "No Connection Type"
        return f"{connection_type} of {username}"

    @staticmethod
    def get_avatar_url(user_info: dict, connection_type: str) -> str:
        """
        Retrieves the avatar URL based on the connection type (GITHUB or FT).
        Stores the avatar of the user that they have on either Github or 42 account.
        """
        if connection_type == OauthConnection.GITHUB:
            return user_info.get("avatar_url")
        if connection_type == OauthConnection.FT:
            image_data = user_info.get("image", {})
            return image_data.get("link")
        return None

    @staticmethod
    def save_avatar(avatar_url: str, user) -> str:
        """
        Downloads the avatar image and saves it.
        If an error occurs, no avatar is loaded, and the process is silently ignored.
        """
        avatar_response = requests.get(avatar_url, timeout=OAUTH_AVATAR_DOWNLOAD_TIMEOUT)
        if avatar_response.status_code == 200:  # noqa: PLR2004
            avatar_io = BytesIO(avatar_response.content)

            user.profile.profile_picture.save(
                f"{user.username}_avatar.png",
                ContentFile(avatar_io.getvalue()),
                save=True,
            )
            return None
        return settings.DEFAULT_USER_AVATAR

    def set_connection_as_connected(self, user_info: dict, user) -> None:
        """
        Marks connection as 'connected' and associates it with a user.
        Also tries to fetch & store the user's remote avatar (best-effort).
        """
        self.oauth_id = user_info.get("id")
        self.user = user
        self.status = self.CONNECTED
        if not user.profile.profile_picture:
            avatar_url = self.get_avatar_url(user_info, self.connection_type)
            if avatar_url:
                logger.info(
                    "OAuth avatar fetch: user_id=%s connection_type=%s url=%s",
                    user.id,
                    self.connection_type,
                    avatar_url,
                )
                try:
                    self.save_avatar(avatar_url, user)
                except (requests.RequestException, ValueError, OSError) as exc:
                    logger.warning(
                        "OAuth avatar download failed: user_id=%s url=%s error=%s",
                        user.id,
                        avatar_url,
                        str(exc),
                    )

        self.save()
        logger.info(
            "OAuth connection set to CONNECTED: user_id=%s connection_type=%s oauth_id=%s",
            user.id,
            self.connection_type,
            self.oauth_id,
        )

    def request_access_token(self, config: dict, code: str) -> tuple:
        """
        Requests an access token from the OAuth provider.
        Returns a tuple (access_token, None) if successful.
        Returns a tuple (None, (error_message, status_code)) on failure.
        """
        try:
            token_response = requests.post(
                config["token_uri"],
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "code": code,
                    "redirect_uri": config["redirect_uri"],
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
                timeout=OAUTH_TOKEN_REQUEST_TIMEOUT,
            )

            try:
                token_data = token_response.json()
            except ValueError:
                logger.warning(
                    "OAuth token response invalid JSON: platform=%s status=%s",
                    self.connection_type,
                    token_response.status_code,
                )
                return None, ("Authentication failed. Please try again.", 422)

            if token_response.status_code != 200 or "access_token" not in token_data:  # noqa: PLR2004
                provider_error = token_data.get("error", "provider_error")
                is_app_error = provider_error in ["invalid_request", "invalid_client", "invalid_grant"]
                logger.warning(
                    "OAuth token request failed: platform=%s error=%s status=%s",
                    self.connection_type,
                    provider_error,
                    token_response.status_code,
                )
                error_message = "Authentication failed. Please try again."
                status_code = 503 if is_app_error else 422
                return None, (error_message, status_code)

            access_token = token_data["access_token"]
            scope_string = token_data.get("scope", "")
            granted_scopes = set(scope_string.replace(",", " ").split())
            return (access_token, granted_scopes), None

        except requests.exceptions.Timeout:
            error_message = "The request timed out while retrieving the access token."
            return None, (error_message, 408)
        except requests.RequestException:
            logger.warning("OAuth token request network error: platform=%s", self.connection_type)
            return None, ("Failed to connect to authentication server", 503)

    def get_user_info(self, config: dict, access_token: str) -> tuple:
        """
        Returns (user_info_dict, None) or (None, (message, status))
        """
        try:
            user_resp = requests.get(
                config["user_info_uri"],
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=OAUTH_USER_INFO_TIMEOUT,
            )
            if user_resp.status_code != 200:  # noqa: PLR2004
                try:
                    provider_error = user_resp.json().get("error", "api_error")
                except ValueError:
                    provider_error = "api_error"
                logger.warning(
                    "OAuth user info request failed: platform=%s error=%s status=%s",
                    self.connection_type,
                    provider_error,
                    user_resp.status_code,
                )
                return None, ("Failed to retrieve user information", 401)

            try:
                return user_resp.json(), None
            except ValueError:
                logger.warning(
                    "OAuth user info response invalid JSON: platform=%s status=%s",
                    self.connection_type,
                    user_resp.status_code,
                )
                return None, ("Failed to retrieve user information", 422)

        except requests.Timeout:
            return None, ("The request timed out while retrieving user information.", 408)
        except requests.RequestException:
            return None, ("Failed to connect to the server while retrieving user information.", 503)

    def check_state_and_validity(self, platform: str, state: str) -> tuple:
        """
        Checks if the state is valid and not expired.
        Returns None if valid.
        Returns a tuple (error_message, status_code) if invalid.
        """
        now = timezone.now()
        if self.date + timedelta(minutes=OAUTH_STATE_EXPIRY_MINUTES) < now:
            return "Expired state: authentication request timed out", 408

        if state != self.state or platform != self.connection_type:
            return "Invalid state or platform", 422

        if self.status == self.USED:
            return "State already used", 422

        return None

    def mark_state_as_used(self) -> None:
        """
        Marks the OAuth state as used to prevent replay attacks.
        Should be called after successful state validation.
        """
        try:
            self.status = self.USED
            self.save()
        except DatabaseError as exc:
            logger.error(
                "Failed to mark OAuth state as used: state=%s platform=%s error=%s",
                self.state,
                self.connection_type,
                str(exc),
            )
            raise

    def create_or_update_user(self, user_info: dict) -> tuple:
        """
        Creates or updates a user based on OAuth user info.
        Returns a tuple (user, None) if successful.
        Returns a tuple (None, (error_message, status_code)) on failure.
        """
        from users.models.user import User

        if not user_info or not isinstance(user_info, dict) or "id" not in user_info:
            return None, ("Invalid user information", 400)

        user = User.objects.for_oauth_id(user_info["id"]).first()
        if not user:
            user = User.objects.validate_and_create_user(
                username=user_info.get("login"),
                oauth_connection=self,
            )
            if not user:
                return None, ("Failed to create user in database.", 503)
        else:
            old_oauth_connection = user.get_oauth_connection()
            if old_oauth_connection:
                old_oauth_connection.delete()

        self.set_connection_as_connected(user_info, user)
        return user, None
