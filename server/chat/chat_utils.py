import logging

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("server")

class ChatUtils:
    def get_user_data(self):
        return {
            "date": timezone.now().isoformat(),
            "username": self.user.username,
            "nickname": self.user.nickname,
            "avatar": (self.profile_picture.url if self.profile_picture else settings.DEFAULT_USER_AVATAR),
        }
