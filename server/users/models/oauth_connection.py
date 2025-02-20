from datetime import datetime, timedelta, timezone
from io import BytesIO
from urllib.parse import quote

import cv2
import numpy as np
import requests
from django.conf import settings
from django.core.exceptions import RequestAborted
from django.core.files.base import ContentFile
from django.db import models
from django.http import HttpResponseRedirect
from ninja.errors import AuthenticationError, HttpError
from PIL import Image, ImageFilter


class OauthConnectionManager(models.Manager):
    """
    Custom manager for handling OAuth connections.
    """

    def for_state_and_pending_status(self, state: str):
        return self.filter(status=self.model.PENDING, state=state)

    def create_pending_connection(self, state: str, platform: str):
        OauthConnection.objects.create(
            state=state,
            connection_type=platform,
            status=OauthConnection.PENDING,
        )


class OauthConnection(models.Model):
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
    STATUS_CHOICES = ((PENDING, "Pending"), (CONNECTED, "Connected"))

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
    date = models.DateTimeField(auto_now_add=True)

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
        """
        if connection_type == OauthConnection.GITHUB:
            return user_info.get("avatar_url")
        if connection_type == OauthConnection.FT:
            image_data = user_info.get("image", {})
            return image_data.get("link")
        return None

    @staticmethod
    def cartoonize_image(img: Image) -> Image:
        """
        Apply a cartoon effect to an image using Pillow and OpenCV.
        """
        # Convert to RGB if image is in RGBA mode
        if img.mode == "RGBA":
            img = img.convert("RGB")

        img = img.filter(ImageFilter.SMOOTH_MORE)
        img_array = np.array(img)

        # Ensure the image array is in the correct format for OpenCV
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        gray = cv2.medianBlur(gray, 5)

        edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)

        color = cv2.bilateralFilter(img_array, 9, 300, 300)
        cartoon = cv2.bitwise_and(color, color, mask=edges)

        # Convert back to RGB for PIL
        cartoon = cv2.cvtColor(cartoon, cv2.COLOR_BGR2RGB)
        return Image.fromarray(cartoon)

    @staticmethod
    def save_cartoon_avatar(avatar_url: str, user) -> None:
        """
        Downloads the avatar image, applies the cartoon effect, and saves it.
        If an error occurs, no avatar is loaded, and the process is silently ignored.
        """
        try:
            avatar_response = requests.get(avatar_url, timeout=5)
            avatar_response.raise_for_status()

            avatar_image = Image.open(BytesIO(avatar_response.content))
            cartoon_image = OauthConnection.cartoonize_image(avatar_image)

            avatar_io = BytesIO()
            cartoon_image.save(avatar_io, format="PNG")
            avatar_io.seek(0)

            user.profile.profile_picture.save(
                f"{user.username}_avatar.png",
                ContentFile(avatar_io.read()),
                save=True,
            )
        except (requests.RequestException, OSError):
            pass

    def set_connection_as_connected(self, user_info: dict, user) -> None:
        """
        Marks connection as 'connected' and associates it with a user.
        """
        self.oauth_id = user_info.get("id")
        self.user = user
        self.status = self.CONNECTED

        self.avatar_url = self.get_avatar_url(user_info, self.connection_type)
        if self.avatar_url:
            self.save_cartoon_avatar(self.avatar_url, self.user)

        self.save()

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
                    "redirect_uri": config["redirect_uris"][0],
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
                timeout=10,
            )

            token_data = token_response.json()

            if token_response.status_code != 200 or "access_token" not in token_data:  # noqa: PLR2004
                provider_error = token_data.get("error", "unknown_error")
                is_app_error = provider_error in ["invalid_request", "invalid_client", "invalid_grant"]
                error_message = f"Provider error: {provider_error}"
                status_code = 503 if is_app_error else 401
                return None, (error_message, status_code)

            return token_data["access_token"], None

        except requests.exceptions.Timeout:
            error_message = "The request timed out while retrieving the access token."
            return None, (error_message, 408)
        except requests.exceptions.JSONDecodeError:
            error_message = "Invalid JSON response from authorization server"
            return None, (error_message, 422)
        except requests.exceptions.RequestException:
            error_message = "Failed to retrieve access token"
            return None, (error_message, 500)

    def get_user_info(self, config: dict, access_token: str) -> tuple:
        """
        Gets user information from the OAuth provider using the access token.
        Returns a tuple (user_info, None) if successful.
        Returns a tuple (None, (error_message, status_code)) on failure.
        """
        try:
            user_response = requests.get(
                config["user_info_uri"],
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )

            if user_response.status_code != 200:
                error_data = user_response.json()
                provider_error = error_data.get("error", "api_error")
                error_message = provider_error if provider_error else "api_error"
                return None, (error_message, 401)

            return user_response.json(), None

        except requests.exceptions.Timeout:
            error_message = "The request timed out while retrieving user information."
            return None, (error_message, 408)
        except requests.exceptions.ConnectionError:
            error_message = "Failed to connect to the server while retrieving user information."
            return None, (error_message, 503)
        except requests.exceptions.RequestException:
            error_message = "Failed to retrieve user info"
            return None, (error_message, 500)

    def check_state_and_validity(self, platform: str, state: str) -> tuple:
        """
        Checks if the state is valid and not expired.
        Returns None if valid.
        Returns a tuple (error_message, status_code) if invalid.
        """
        now = datetime.now(timezone.utc)
        if self.date + timedelta(minutes=5) < now:
            return "Expired state: authentication request timed out", 408

        if state != self.state or platform != self.connection_type:
            return "Invalid state or platform", 422

        return None

    def create_or_update_user(self, user_info: dict) -> tuple:
        """
        Creates or updates a user based on OAuth user info.
        Returns a tuple (user, None) if successful.
        Returns a tuple (None, (error_message, status_code)) on failure.
        """
        from users.models.user import User

        user = User.objects.for_oauth_id(user_info["id"]).first()
        if not user:
            user = User.objects.validate_and_create_user(
                username=user_info.get("login"),
                oauth_connection=self,
            )
            if not user:
                return None, ("Failed to create user in database.", 500)
        else:
            old_oauth_connection = user.get_oauth_connection()
            if old_oauth_connection:
                old_oauth_connection.delete()

        self.set_connection_as_connected(user_info, user)
        return user, None
