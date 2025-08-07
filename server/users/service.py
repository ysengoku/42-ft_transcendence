import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import Profile

User = get_user_model()

logger = logging.getLogger("server")


@staticmethod
def check_inactive_users():
    threshold = timezone.now() - timedelta(minutes=30)

    inactive_users = Profile.objects.filter(
        last_activity__lt=threshold,
        is_online=True,
    )

    channel_layer = get_channel_layer()

    for user in inactive_users:
        user.is_online = False
        user.nb_active_connexions = 0
        user.save(update_fields=["is_online", "nb_active_connexions"])
        logger.info("User %s is inactive (no activity for 30 minutes) : set offline", user.user.username)

        async_to_sync(channel_layer.group_send)(
            "online_users",
            {
                "type": "user_status",
                "action": "user_offline",
                "data": {
                    "username": user.user.username,
                    "nickname": user.nickname if hasattr(user, "nickname") else user.user.username,
                    "status": "offline",
                    "date": timezone.now().isoformat(),
                },
            },
        )


class OnlineStatusService:
    @staticmethod
    def notify_online_status(consumer_self, onlinestatus):
        action = "user_online" if onlinestatus == "online" else "user_offline"
        user_data = {
            "username": consumer_self.user.username,
            "status": onlinestatus,
            "date": timezone.now().isoformat(),
        }
        async_to_sync(consumer_self.channel_layer.group_send)(
            "online_users",
            {
                "type": "user_status",
                "action": action,
                "data": user_data,
            },
        )
