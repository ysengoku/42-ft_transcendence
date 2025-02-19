from io import BytesIO

import cv2
import numpy as np
import requests
from django.core.files.base import ContentFile
from django.db import models
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
