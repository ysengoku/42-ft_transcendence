import json
import logging
import time
from datetime import datetime, timedelta

import redis
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.utils import DatabaseError
from django.db.models import Q
from django.utils import timezone

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
                    {"user_id": user_id, "timestamp": int(time.time())}),
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

    # Un utilisateur est inactif si sa dernière activité date de plus de 5 minutes
    inactive_users = User.objects.filter(
        last_activity__lt=threshold,
        is_online=True
    )

    for user in inactive_users:
        logger.info("User %s is inactive (last activity: %s)", 
                   user.username, 
                   user.last_activity)
        logger.info("User had %i active connexions", user.nb_active_connexions)
        user.is_online = False
        logger.info("User is now offline")
        user.nb_active_connexions = 0  # On réinitialise le compteur de connexions
        logger.info("User nb_active_connexions set to 0 : %i", user.nb_active_connexions)
        user.save()
        logger.info("User saved")
        redis_status_manager.set_user_offline(user.id)
        logger.info("User set offline in redis")


class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        """
        Handle new WebSocket connection
        """
        self.user = self.scope["user"]

        # Verify user authentication using Django's built-in auth
        if not self.user or not self.user.is_authenticated:
            logger.debug(
                "WebSocket connection rejected: User not authenticated")
            self.close()
            return

        try:
            self.user_profile = self.user.profile
            max_connexions = 10
            
            # Incrémentation atomique du compteur de connexions
            self.user_profile.nb_active_connexions = models.F('nb_active_connexions') + 1
            self.user_profile.save(update_fields=['nb_active_connexions'])
            self.user_profile.refresh_from_db()

            if self.user_profile.nb_active_connexions > max_connexions:
                logger.warning("Too many simultaneous connexions for user %s", self.user.username)
                self.close()
                return

            self.user_profile.update_activity()  # set online
            logger.info("User %s had %i active connexions", self.user.username,
                      self.user_profile.nb_active_connexions)

            # Add user to the online_users group
            self.group_name = "online_users"
            async_to_sync(self.channel_layer.group_add)(
                self.group_name, self.channel_name)

            self.accept()
            self.notify_online_status("online")

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
            self.user_profile.nb_active_connexions = models.F('nb_active_connexions') - 1
            self.user_profile.save(update_fields=['nb_active_connexions'])
            self.user_profile.refresh_from_db()

            if self.user_profile.nb_active_connexions < 0:
                self.user_profile.nb_active_connexions = 0
                self.user_profile.save(update_fields=['nb_active_connexions'])

            if self.user_profile.nb_active_connexions == 0:
                self.user_profile.is_online = False
                self.user_profile.save(update_fields=['is_online'])
                redis_status_manager.set_user_offline(self.user.id)
                self.notify_online_status("offline")

        except DatabaseError as e:
            logger.error("Database error during disconnect: %s", e)

        logger.info("User %s has %s active connexions",
                  self.user.username, self.user_profile.nb_active_connexions)

        # Remove user from the group
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name)

    def receive(self, text_data):
        """
        Handle received WebSocket messages
        Currently a no-op, but can be extended
        """

    def user_status(self, event):
        """
        Send status updates to the client
        """
        self.send(text_data=json.dumps({
            "action": event.get("action"),
            "data": event.get("data"),
        }))

    def notify_online_status(self, onlinestatus, user_profile=None):
        logger.info("function notify online status !")
        action = "user_online" if onlinestatus == "online" else "user_offline"
        
        # Utiliser le profil fourni ou celui de l'instance
        profile = user_profile if user_profile else self.user_profile
        
        # Préparer les données utilisateur
        user_data = {
            "username": self.user.username,
            "nickname": profile.nickname if hasattr(profile, 'nickname') else self.user.username,
            "avatar": profile.profile_picture.url if hasattr(profile, 'profile_picture') and profile.profile_picture else settings.DEFAULT_USER_AVATAR,
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


def get_online_users():
    """
    Retrieve list of online user IDs

    Returns:
        list: List of online user IDs

    """
    return redis_status_manager.get_online_users()
