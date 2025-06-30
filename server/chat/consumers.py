import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.db import DatabaseError, models, transaction

from users.consumers import OnlineStatusConsumer, redis_status_manager
from users.models import Profile

from .chat_events import ChatEvent
from .chat_utils import ChatUtils
from .duel_events import DuelEvent
from .models import Chat, Notification
from .tournament_events import TournamentEvent
from .validator import Validator

logger = logging.getLogger("server")


class UserEventsConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            self.close()
            return
        try:
            self.user_profile = self.user.profile
        except AttributeError:
            logger.error("User %s has no profile", self.user.username)
            self.close()
            return

        try:
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                self.user_profile.nb_active_connexions = models.F("nb_active_connexions") + 1
                self.user_profile.update_activity()
                self.user_profile.save(update_fields=["nb_active_connexions"])

                self.user_profile.refresh_from_db()
                redis_status_manager.set_user_online(self.user.id)
                logger.info(
                    "User %s connected, now has %i active connexions",
                    self.user.username,
                    self.user_profile.nb_active_connexions,
                )
        except DatabaseError as e:
            logger.error("Database error during connect: %s", e)
            self.close()
            return

        self.chats = Chat.objects.for_participants(self.user_profile)
        async_to_sync(self.channel_layer.group_add)(
            f"user_{self.user.id}",
            self.channel_name,
        )
        async_to_sync(self.channel_layer.group_add)(
            "online_users",
            self.channel_name,
        )
        for chat in self.chats:
            async_to_sync(self.channel_layer.group_add)(
                f"chat_{chat.id}",
                self.channel_name,
            )

        self.accept()

    def disconnect(self, close_code):
        if not hasattr(self, "user_profile"):
            return
        logger.info("User %s has %s active connexions", self.user.username, self.user_profile.nb_active_connexions)
        if not Profile.objects.filter(pk=self.user_profile.pk).exists():
            logger.info("User profile does not exist. Possibly deleted.")
            return

        if hasattr(self, "chats") and self.chats:
            for chat in self.chats:
                async_to_sync(self.channel_layer.group_discard)(
                    f"chat_{chat.id}",
                    self.channel_name,
                )
            async_to_sync(self.channel_layer.group_discard)(
                f"user_{self.user.id}",
                self.channel_name,
            )
        try:
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                self.user_profile.nb_active_connexions = models.F("nb_active_connexions") - 1
                self.user_profile.save(update_fields=["nb_active_connexions"])
                self.user_profile.refresh_from_db()

                if self.user_profile.nb_active_connexions < 0:
                    self.user_profile.nb_active_connexions = 0
                    self.user_profile.save(update_fields=["nb_active_connexions"])

                logger.info(
                    "User %s has %s active connexions",
                    self.user.username,
                    self.user_profile.nb_active_connexions,
                )
                # Mark offline only if it was last disconnexion
                if self.user_profile.nb_active_connexions == 0:
                    self.user_profile.is_online = False
                    self.user_profile.save(update_fields=["is_online"])
                    redis_status_manager.set_user_offline(self.user.id)
                    OnlineStatusConsumer.notify_online_status(self, "offline")
                    logger.info("User %s is now offline (no more active connexions)", self.user.username)

                    # Remove user from the groups only when they have no more active connections
                    async_to_sync(self.channel_layer.group_discard)(
                        "online_users",
                        self.channel_name,
                    )
                else:
                    logger.info(
                        "User %s still has %i active connexions",
                        self.user.username,
                        self.user_profile.nb_active_connexions,
                    )

        except DatabaseError as e:
            logger.error("Database error during disconnect: %s", e)

    def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get("action")

            if not action:
                logger.warning("Message without action received")
                return

            text_data_json.get("data", {})
            entire_data = text_data_json.get("data", {})
            if not Validator.validate_action_data(action, entire_data):
                self.close()
                return
            match action:
                case "new_message":
                    ChatEvent(self).handle_message(text_data_json)
                case "read_notification":
                    self.read_notification(text_data_json)
                case ("user_offline", "user_online"):
                    self.handle_online_status(text_data_json)
                case "like_message":
                    ChatEvent(self).handle_like_message(text_data_json)
                case "unlike_message":
                    ChatEvent(self).handle_unlike_message(text_data_json)
                case "read_message":
                    ChatEvent(self).handle_read_message(text_data_json)
                case "game_invite":
                    DuelEvent(self).send_game_invite(text_data_json)
                case "reply_game_invite":
                    DuelEvent(self).reply_game_invite(text_data_json)
                case "game_accepted":
                    DuelEvent(self).accept_game_invite(text_data_json)
                case "game_declined":
                    DuelEvent(self).decline_game_invite(text_data_json)
                case "cancel_game_invite":
                    DuelEvent(self).cancel_game_invite(text_data_json)
                case "new_tournament":
                    TournamentEvent(self).handle_new_tournament(text_data_json)
                case "add_new_friend":
                    self.add_new_friend(text_data_json)
                case "join_chat":
                    ChatEvent(self)
                    self.join_chat(text_data_json)
                case _:
                    logger.warning("Unknown action : %s", action)
                    self.close()

        except json.JSONDecodeError:
            logger.warning("Invalid JSON message")
            self.close()

    def handle_online_status(self, event):
        """
        Handle online status updates from other users
        """
        action = event.get("action")
        user_data = event.get("data", {})

        self.send(
            text_data=json.dumps(
                {
                    "action": action,
                    "data": user_data,
                },
            ),
        )

    def user_status(self, event):
        """
        Handle user status messages from the channel layer.
        This method is called when a user's status changes (online/offline).
        """
        self.send(
            text_data=json.dumps(
                {
                    "action": event.get("action"),
                    "data": event.get("data"),
                },
            ),
        )

    def read_notification(self, data):
        notification_id = data["data"].get("id")
        try:
            with transaction.atomic():
                notification = Notification.objects.get(id=notification_id)
                notification.is_read = True
                notification.save(update_fields=["is_read"])
        except Notification.DoesNotExist:
            logger.debug("Notification %s does not exist", notification_id)

    def add_new_friend(self, data):
        sender_id = data["data"].get("sender_id")
        receiver_id = data["data"].get("receiver_id")
        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        # Verify if not already friend
        if not sender.friends.filter(id=receiver.id).exists():
            sender.friends.add(receiver)
        # Create notification
        notification = Notification.objects.action_new_friend(receiver, sender)

        notification_data = ChatUtils.get_user_data(sender)
        # Add id to the notification data
        notification_data["id"] = str(notification.id)

        self.send(
            text_data=json.dumps(
                {
                    "action": "new_friend",
                    "data": notification_data,
                },
            ),
        )

    def game_found(self, event):
        self.send(text_data=json.dumps(event["data"]))

    def chat_message(self, event):
        ChatEvent(self).chat_message(event)

    def chat_like_update(self, event):
        ChatEvent(self).chat_like_update(event)

    def send_like_update(self, chat_id, message_id, is_liked):
        ChatEvent(self).send_like_update(chat_id, message_id, is_liked)

    def join_chat(self, event):
        ChatEvent(self).join_chat(event)
