import json
import logging
import time
from datetime import datetime, timedelta

import redis
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Q
from django.db.utils import DatabaseError
from django.utils import timezone

from users.models import Profile

User = get_user_model()

logger = logging.getLogger("server")


class RedisUserStatusManager:
    """
    Manages user online status using Redis
    Provides a centralized way to track and manage online users
    """

    def __init__(self, redis_client=None):
        # Use provided Redis client or create a new one
        self._redis = redis_client or redis.Redis(
            host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0)
        # Prefix for Redis keys to avoid conflicts
        self._online_users_key = "online_users"
        # Timeout for online status (1 hour)
        self._timeout = 3600

    def set_user_online(self, user_id):
        """
        Mark a user as online

        Args:
            user_id (int): ID of the user to mark online

        """
        try:
            # Add user to the set of online users with an expiration
            self._redis.setex(
                f"{self._online_users_key}:{user_id}",
                self._timeout,
                json.dumps(
                    {"user_id": str(user_id), "timestamp": int(time.time())}),
            )
        except redis.RedisError as e:
            logger.debug("Error setting user online: %s ", e)

    def set_user_offline(self, user_id):
        """
        Mark a user as offline

        Args:
            user_id (int): ID of the user to mark offline

        """
        try:
            # Remove the user from online users
            self._redis.delete(f"{self._online_users_key}:{user_id}")
        except redis.RedisError as e:
            logger.debug("Error setting user offline: %s ", e)

    def get_online_users(self):
        """
        Retrieve all online users

        Returns:
            list: List of online user IDs

        """
        try:
            # Find all keys matching the online users pattern
            online_keys = self._redis.keys(f"{self._online_users_key}:*")

            # Extract user IDs from the keys
            return [int(key.decode("utf-8").split(":")[-1]) for key in online_keys]
        except redis.RedisError as e:
            logger.debug("Error getting online users : %s ", e)
            return []


# Create a singleton instance of the Redis status manager
redis_status_manager = RedisUserStatusManager()


def check_inactive_users():
    logger.info("Checking for inactive users")
    threshold = timezone.now() - timedelta(minutes=5)

    inactive_users = Profile.objects.filter(
        last_activity__lt=threshold,
        is_online=True,
    )

    channel_layer = get_channel_layer()

    for user in inactive_users:
        logger.info("User %s is inactive (no activity for 5 minutes and no active connections)",
                    user.user.username)

        user.is_online = False
        user.nb_active_connexions = 0
        user.save(update_fields=['is_online', 'nb_active_connexions'])
        redis_status_manager.set_user_offline(user.id)
        logger.info("User set offline")

        async_to_sync(channel_layer.group_send)(
            "online_users",
            {
                "type": "user_status",
                "action": "user_offline",
                "data": {
                    "username": user.user.username,
                    "nickname": user.nickname if hasattr(user, 'nickname') else user.user.username,
                    "status": "offline",
                    "date": timezone.now().isoformat(),
                },
            },
        )


class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        """
        Handle WebSocket connection
        """
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            self.close()
            return

        try:
            self.user_profile = self.user.profile
            max_connexions = 10

            # Increment the number of active connexions and get the new value
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                if self.user_profile.nb_active_connexions >= max_connexions:
                    logger.warning(
                        "Too many simultaneous connexions for user %s", self.user.username)
                    self.close()
                    return
                self.user_profile.nb_active_connexions = models.F(
                    'nb_active_connexions') + 1
                self.user_profile.is_online = True
                self.user_profile.last_activity = timezone.now()
                self.user_profile.save(
                    update_fields=['nb_active_connexions', 'is_online', 'last_activity'])
                self.user_profile.refresh_from_db()
                self.user_profile.update_activity()
            redis_status_manager.set_user_online(self.user.id)
            logger.info("User %s connected, now has %i active connexions",
                        self.user.username, self.user_profile.nb_active_connexions)

            # Add user's channel to personal group to receive answers to invitations sent
            async_to_sync(self.channel_layer.group_add)(
                f"user_{self.user.id}",
                self.channel_name,
            )
            async_to_sync(self.channel_layer.group_add)(
                "online_users",
                self.channel_name,
            )
            self.accept()

            # Notifier tous les utilisateurs du changement de statut
            self.notify_online_status("online", self.user_profile)
            logger.info("User %s is now online with %i active connexions",
                        self.user.username, self.user_profile.nb_active_connexions)

        except DatabaseError as e:
            logger.error("Database error during connect: %s", e)
            self.close()

    def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        if not hasattr(self, "user_profile"):
            return

        try:
            # Décrémenter le compteur de connexions et récupérer la nouvelle valeur
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                self.user_profile.nb_active_connexions = models.F(
                    'nb_active_connexions') - 1
                self.user_profile.save(update_fields=['nb_active_connexions'])
                self.user_profile.refresh_from_db()

                # S'assurer que le compteur ne devient pas négatif
                if self.user_profile.nb_active_connexions < 0:
                    self.user_profile.nb_active_connexions = 0
                    self.user_profile.save(
                        update_fields=['nb_active_connexions'])

                # Marquer comme hors ligne uniquement si c'était la dernière connexion
                if self.user_profile.nb_active_connexions == 0:
                    self.user_profile.is_online = False
                    self.user_profile.save(update_fields=['is_online'])
                    redis_status_manager.set_user_offline(self.user.id)
                    self.notify_online_status("offline", self.user_profile)
                    logger.info("User %s is now offline (no more active connexions)",
                                self.user.username)

                    # Remove user from the groups only when they have no more active connections
                    async_to_sync(self.channel_layer.group_discard)(
                        f"user_{self.user.id}",
                        self.channel_name,
                    )
                    async_to_sync(self.channel_layer.group_discard)(
                        "online_users",
                        self.channel_name,
                    )
                else:
                    logger.info("User %s still has %i active connexions",
                                self.user.username, self.user_profile.nb_active_connexions)

        except DatabaseError as e:
            logger.error("Database error during disconnect: %s", e)

    def notify_online_status(self, onlinestatus, user_profile=None):
        logger.info("function notify online status !")
        action = "user_online" if onlinestatus == "online" else "user_offline"
        profile = user_profile if user_profile else self.user_profile
        user_data = {
            "username": self.user.username,
            "status": onlinestatus,
            "date": timezone.now().isoformat()
        }
        async_to_sync(self.channel_layer.group_send)(
            "online_users",
            {
                "type": "user_status",
                "action": action,
                "data": user_data,
            },
        )

    def user_status(self, event):
        """
        Handle user status messages from the channel layer.
        This method is called when a user's status changes (online/offline).
        """
        action = event.get("action")
        data = event.get("data", {})
        if action == "force_disconnect":
            logger.info("Forcing disconnect for user %s: %s",
                        self.user.username, data.get('message', 'No reason provided'))
            self.close()
            return
        self.send(text_data=json.dumps({
            "action": action,
            "data": data,
        }))


def get_online_users():
    """
    Retrieve list of online user IDs

    Returns:
        list: List of online user IDs

    """
    return redis_status_manager.get_online_users()
