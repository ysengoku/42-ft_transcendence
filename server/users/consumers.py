import json
import logging
import time

import redis
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings
from django.contrib.auth import get_user_model

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


class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        """
        Handle new WebSocket connection
        """
        logger.debug("WebSocket connection attempt received")
        self.user = self.scope["user"]

        # Verify user authentication using Django's built-in auth
        if not self.user or not self.user.is_authenticated:
            logger.debug(
                "WebSocket connection rejected: User not authenticated")
            self.close()
            return

        # Add user to the online_users group
        self.group_name = "online_users"
        async_to_sync(self.channel_layer.group_add)(
            self.group_name, self.channel_name)

        # Accept the connection
        self.accept()

        # Update user's online status
        self._set_user_online(True)

        # Announce to other users
        self._announce_status(True)

    def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        if not hasattr(self, "user") or not self.user or not self.user.is_authenticated:
            return

        # Update user's offline status
        self._set_user_online(False)

        # Announce to other users
        self._announce_status(False)

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

        Args:
            event (dict): Event containing user status information

        """
        self.send(
            text_data=json.dumps(
                {
                    "type": "status_update",
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "online": event["online"],
                },
            ),
        )

    def _set_user_online(self, status):
        """
        Update user's online status

        Args:
            status (bool): Whether the user is online or offline

        """
        if status:
            # Mark user as online
            redis_status_manager.set_user_online(self.user.id)
        else:
            # Mark user as offline
            redis_status_manager.set_user_offline(self.user.id)

    def _announce_status(self, status):
        """
        Announce status change to all connected users

        Args:
            status (bool): Whether the user is online or offline

        """
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {"type": "user_status", "user_id": str(
                self.user.id), "username": self.user.username, "online": status},
        )


def get_online_users():
    """
    Retrieve list of online user IDs

    Returns:
        list: List of online user IDs

    """
    return redis_status_manager.get_online_users()
