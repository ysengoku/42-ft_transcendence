import json
import logging
from datetime import timedelta
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError, models, transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import now

from users.consumers import (OnlineStatusConsumer, check_inactive_users,
                             redis_status_manager)
from users.models import Profile

from .models import Chat, ChatMessage, GameInvitation, Notification

logger = logging.getLogger("server")


def get_user_data(self):
    return {
        "date": timezone.now().isoformat(),
        "username": self.user.username,
        "nickname": self.user.nickname,
        "avatar": (
            self.profile_picture.url
            if self.profile_picture
            else settings.DEFAULT_USER_AVATAR
        ),
    }


class UserEventsConsumer(WebsocketConsumer):

    def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            self.close()
            return
        try:
            self.user_profile = self.user.profile
        except AttributeError:
            logger.error("User %s has no profile", self.user.username)
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
        self.user_profile.update_activity()
        OnlineStatusConsumer.notify_online_status(
            self, "online", self.user_profile)
        logger.info("User %s is now online with %i active connexions",
                    self.user.username, self.user_profile.nb_active_connexions)

    def disconnect(self, close_code):
        if hasattr(self, "user_profile"):
            if not Profile.objects.filter(pk=self.user_profile.pk).exists():
                logger.info("User profile does not exist. Possibly deleted.")
                return
            OnlineStatusConsumer.notify_online_status(
                self, "offline", self.user_profile)
            logger.info("User %s now has %i active connexions",
                        self.user.username, self.user_profile.nb_active_connexions)

            async_to_sync(self.channel_layer.group_discard)(
                "online_users",
                self.channel_name,
            )
            if hasattr(self, "chats") and self.chats:
                for chat in self.chats:
                    async_to_sync(self.channel_layer.group_discard)(
                        f"chat_{chat.id}",
                        self.channel_name,
                    )

    def join_chat(self, event):
        chat_id = event["data"]["chat_id"]
        try:
            async_to_sync(self.channel_layer.group_add)(
                f"chat_{chat_id}",
                self.channel_name,
            )
        except Chat.DoesNotExist:
            logger.debug("Acces denied to the chat %s for %s",
                         chat_id, self.user.username)

    def is_valid_uuid(self, val):
        try:
            UUID(str(val))
            return True
        except ValueError:
            return False

    def validate_action_data(self, action, data):
        expected_types = {
            "new_message": {"content": str, "chat_id": str},
            "like_message": {"id": str, "chat_id": str},
            "unlike_message": {"id": str, "chat_id": str},
            "read_message": {"id": str},
            "read_notification": {"id": str},
            "notification": {"message": str, "type": str},
            # TODO : replace game_invite by reply_game_invite
            "game_invite": {"id": str, "accept": bool},
        }

        uuid_fields = {
            "new_message": ["chat_id"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "read_notification": ["id"],
            # TODO : replace game_invite by reply_game_invite -->
            "game_invite": ["id"],
            "game_accepted": ["id"],
            "game_declined": ["id"],
            # TODO : replace game_invite by reply_game_invite <--
            # TODO : check these ids
            "new_tournament": ["id", "organizer_id"],
            "add_new_friend": ["id"],
            "join_chat": ["chat_id"],
            "room_created": ["chat_id"],
        }
       # Types verification
        if action in expected_types:
            for field, expected_type in expected_types[action].items():
                value = data.get(field)
                if not isinstance(value, expected_type):
                    logger.warning(
                        "Invalid type for '%s' (waited for %s, received %s)",
                        field, expected_type.__name__, type(value).__name__,
                    )
                    return False

        # UUID verification
        if action in uuid_fields:
            for field in uuid_fields[action]:
                value = data.get(field)
                if value and not self.is_valid_uuid(value):
                    logger.warning("Invalid UUID format for '%s'", field)
                    return False

        return True

    # Receive message from WebSocket
    def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get("action")

            if not action:
                logger.warning("Message without action received")
                return

            text_data_json.get("data", {})
            entire_data = text_data_json.get("data", {})
            required_fields = {
                "new_message": ["content", "chat_id"],
                "notification": ["message", "type"],
                "like_message": ["id", "chat_id"],
                "unlike_message": ["id", "chat_id"],
                "read_message": ["id"],
                # TODO : check game_invite and reply_game_invite
                "game_invite": ["sender_id", "receiver_id"],
                "reply_game_invite": ["id", "accept"],
                "game_accepted": ["invitation_id"],
                "game_declined": ["invitation_id"],
                "new_tournament": ["tournament_id", "tournament_name", "organizer_id"],
                "add_new_friend": ["sender_id", "receiver_id"],
                "user_online": ["username"],
                "user_offline": ["username"],
            }

            if action in required_fields:
                for field in required_fields[action]:
                    if field not in entire_data:
                        logger.warning(
                            "Missing field [{%s}] for action {%s}", field, action)
                        return
            if not self.validate_action_data(action, entire_data):
                return
            match action:
                case "new_message":
                    self.handle_message(text_data_json)
                case "notification":
                    self.handle_notification(text_data_json)
                case "read_notification":
                    self.handle_notification(text_data_json)
                case ("user_offline", "user_online"):
                    self.handle_online_status(text_data_json)
                case "like_message":
                    self.handle_like_message(text_data_json)
                case "unlike_message":
                    self.handle_unlike_message(text_data_json)
                case "read_message":
                    self.handle_read_message(text_data_json)
                # TODO : check game_invite and reply_game_invite -->
                case "game_invite":
                    self.send_game_invite(text_data_json)
                case "game_accepted":
                    self.accept_game_invite(text_data_json)
                case "game_declined":
                    self.decline_game_invite(text_data_json)
                # TODO : check game_invite and reply_game_invite <--
                case "new_tournament":
                    self.handle_new_tournament(text_data_json)
                case "add_new_friend":
                    self.add_new_friend(text_data_json)
                case "join_chat":
                    self.join_chat(text_data_json)
                case "room_created":
                    self.send_room_created(
                        text_data_json.get("data", {}).get("chat_id"))
                case _:
                    logger.debug("Unknown action : %s", action)

        except json.JSONDecodeError:
            logger.warning("Invalid JSON message")

    def handle_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        chat_id = message_data.get("chat_id")

        # security check: chat should exist
        chat = (
            Chat.objects
            .for_participants(self.user_profile)
            .with_other_user_profile_info(self.user_profile)
            .filter(id=chat_id)
            .first()
        )
        if not chat:
            return

        # security check: user should be in the chat
        is_in_chat = chat.participants.filter(id=self.user_profile.id).exists()
        if not is_in_chat:
            return
        is_blocked = chat.is_blocked_user or chat.is_blocked_by_user
        if is_blocked:
            return
        # security check: message should not be longueur than 255
        if message is not None and len(message) > 255:
            logger.warning(
                "Message too long (%d caracteres) from user %s in chat %s",
                len(message), self.user.username, chat_id,
            )
            return
        new_message = ChatMessage.objects.create(
            sender=self.user_profile, content=message, chat=chat)

        async_to_sync(self.channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "chat_message",
                "message": json.dumps({
                    "action": "new_message",
                    "data": {
                        "chat_id": str(chat.id),
                        "id": str(new_message.pk),
                        "content": message,
                        "date": new_message.date.isoformat(),
                        "sender": self.user_profile.user.username,
                        "is_read": False,
                        "is_liked": False,
                    },
                }),
            },
        )

    def handle_online_status(self, event):
        """
        Handle online status updates from other users
        """
        action = event.get("action")
        user_data = event.get("data", {})

        self.send(text_data=json.dumps({
            "action": action,
            "data": user_data,
        }))

# <<<<<<< HEAD
    def user_status(self, event):
        """
        Handle user status messages from the channel layer.
        This method is called when a user's status changes (online/offline).
        """
        self.send(text_data=json.dumps({
            "action": event.get("action"),
            "data": event.get("data"),
        }))

    def handle_like_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        message_id = message_data.get("id")
        chat_id = message_data.get("chat_id")
        logger.info("DATA %s", data)
        logger.info("MESSAGE_DATA %s", message_data)
        try:
            with transaction.atomic():
                message = ChatMessage.objects.select_for_update().get(pk=message_id)
                sender = message.sender.user.username
                if sender != self.user.username:  # prevent from liking own message
                    message.is_liked = True
                    message.save(update_fields=["is_liked"])
                    message.refresh_from_db()
                    transaction.on_commit(
                        lambda: self.send_like_update(chat_id, message_id, True))
                self.send(
                    text_data=json.dumps(
                        {
                            "action": "like_message",
                            "data": {
                                "id": message_id,
                                "chat_id": chat_id,
                            },
                        },
                    ),
                )
        except ObjectDoesNotExist:
            logger.debug("Message %s does not exist.", message_id)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Message not found.",
                    },
                ),
            )

    def handle_unlike_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        message_id = message_data.get("id")
        chat_id = message_data.get("chat_id")
        sender = message_data.get("sender")
        try:
            with transaction.atomic():
                message = ChatMessage.objects.select_for_update().get(pk=message_id)
                sender = message.sender.user.username
                if sender != self.user.username:  # prevent from unliking own message
                    message = ChatMessage.objects.select_for_update().get(pk=message_id)
                    message.is_liked = False
                    message.save(update_fields=["is_liked"])

                    message.refresh_from_db()
                    transaction.on_commit(
                        lambda: self.send_like_update(chat_id, message_id, False))

                    message.refresh_from_db()
                    self.send(
                        text_data=json.dumps(
                            {
                                "action": "unlike_message",
                                "data": {
                                    "id": message_id,
                                    "chat_id": chat_id,
                                },
                            },
                        ),
                    )
        except ObjectDoesNotExist:
            logger.debug("Message %s does not exist", message_id)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Message not found.",
                    },
                ),
            )

    def send_like_update(self, chat_id, message_id, is_liked):
        async_to_sync(self.channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "chat.like_update",
                "message": json.dumps({
                    "action": "like_message",
                    "data": {
                        "id": str(message_id),
                        "chat_id": str(chat_id),
                        "is_liked": is_liked,
                    },
                }),
            },
        )

    def handle_read_message(self, data):
        message_data = data.get("data", {})
        message_id = message_data.get("id")
        try:
            message = ChatMessage.objects.get(pk=message_id)
            message.is_read = True
            message.save()
        except ObjectDoesNotExist:
            logger.debug("Message %s does not exist", message_id)

    # Receive message from room group
    def chat_message(self, event):
        message = event["message"]
        # Send message to WebSocket
        try:
            json.loads(message)
            self.send(text_data=message)
        except json.JSONDecodeError:
            self.send(text_data=json.dumps({"message": message}))

    def chat_like_update(self, event):
        """
        Gère les mises à jour de like envoyées au groupe de chat
        """
        message_data = json.loads(event["message"])
        self.send(text_data=json.dumps({
            "action": message_data["action"],
            "data": message_data["data"],
        }))

    def handle_notification(self, data):
        notification_data = data["data"]["message"]
        notification_type = data["data"]["type"]
        notification_id = data.get("notification_id")

        if not notification_data or not notification_type:
            logger.warning("Incomplete notifications datas")
            return

        # Create the notification in the db
        if notification_id is None:
            Notification.objects.create(
                receiver=self.user_profile,
                data={"message": notification_data, "type": notification_type},
                action=notification_type,
            )
        else:
            try:
                notification = Notification.objects.get(id=notification_id)
                notification.read = True
                notification.save()
            except Notification.DoesNotExist:
                logger.debug("Notification %s does not exist", notification_id)

        self.send(
            text_data=json.dumps(
                {
                    "action": "notification",
                    "data": notification_data,
                    "type_notification": notification_type,
                },
            ),
        )

    def reply_game_invite(self, data):

        invitation_id = data["id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "accepted"
            invitation.save()
            # send notif to sender of the game invitation with receivers' infos
            notification_data = get_user_data(self.user_profile)
            notification_data.update(
                {"id": str(invitation_id), "status": "accepted"})
            async_to_sync(self.channel_layer.group_send)(
                f"user_{invitation.sender.id}",
                {
                    "action": "game_invite",
                    "data": notification_data,
                },
            )

            self.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite",
                        "data": {"id": invitation_id, "status": "accepted"},
                    },
                ),
            )
        except GameInvitation.DoesNotExist:
            logger.debug("Invitation %s does not exist.", invitation_id)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Invitation not found.",
                    },
                ),
            )

    def accept_game_invite(self, data):
        invitation_id = data["id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "accepted"
            invitation.save()
            # send notif to sender of the game invitation with receivers' infos
            notification_data = get_user_data(self.user_profile)
            notification_data.update(
                {"id": str(invitation_id), "status": "accepted"})
            async_to_sync(self.channel_layer.group_send)(
                f"user_{invitation.sender.id}",
                {
                    "action": "game_invite",
                    "data": notification_data,
                },
            )

            self.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite",
                        "data": {"id": invitation_id, "status": "accepted"},
                    },
                ),
            )
        except GameInvitation.DoesNotExist:
            logger.debug("Invitation %s does not exist.", invitation_id)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Invitation not found.",
                    },
                ),
            )

    def decline_game_invite(self, data):
        invitation_id = data["id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "declined"
            invitation.save()
            # send notif to sender of the game invitation
            notification_data = get_user_data(self.user_profile)
            notification_data.update(
                {"id": str(invitation_id), "status": "declined"})
            async_to_sync(self.channel_layer.group_send)(
                f"user_{invitation.sender.id}",
                {
                    "action": "game_invite",
                    "data": notification_data,
                },
            )
            self.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite",
                        "data": {"id": invitation_id, "status": "declined"},
                    },
                ),
            )
        except GameInvitation.DoesNotExist:
            logger.debug("Invitation %s does not exist.", invitation_id)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Invitation not found.",
                    },
                ),
            )

    def send_game_invite(self, data):
        sender_id = data["sender_id"]
        receiver_id = data["receiver_id"]

        if not sender_id or not receiver_id:
            logger.warning("IDs missing for the game_invite")
            return
        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        invitation = GameInvitation.objects.create(
            sender=sender,
            game_session=None,
            recipient=receiver,
        )

        # Envoyer une notification au destinataire
        notification_data = get_user_data(sender)
        notification_data.update({"id": str(invitation.id)})

        async_to_sync(self.channel_layer.group_send)(
            f"user_{receiver_id}",
            {
                "action": "game_invite",
                "data": notification_data,
            },
        )

        self.send(
            text_data=json.dumps(
                {
                    "action": "game_invite",
                    "data": notification_data,
                },
            ),
        )

    def handle_new_tournament(self, data):
        tournament_id = data["tournament_id"]
        tournament_name = data["tournament_name"]
        organizer_id = data["organizer_id"]

        organizer = Profile.objects.get(id=organizer_id)

        # send notification to concerned users
        notification_data = get_user_data(organizer)
        notification_data.update(
            {"id": tournament_id, "tournament_name": tournament_name},
        )

        self.send(
            text_data=json.dumps(
                {
                    "action": "new_tournament",
                    "data": notification_data,
                },
            ),
        )

    def add_new_friend(self, data):
        sender_id = data["sender_id"]
        receiver_id = data["receiver_id"]

        # Add direclty in friendlist
        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        # Verify if not already friend
        if not sender.friends.filter(id=receiver.id).exists():
            sender.friends.add(receiver)
        notification_data = get_user_data(sender)

        self.send(
            text_data=json.dumps(
                {
                    "action": "new_friend",
                    "data": notification_data,
                },
            ),
        )
        # async_to_sync(self.channel_layer.group_send)(
        #     f"user_{receiver_id}",
        #     {
        #         "action": "new_friend",
        #         "data": notification_data,
        #     },
        # )

    def send_room_created(self, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
            participants = [p.user.username for p in chat.participants.all()]

            # Send confirmation to client
            self.send(
                text_data=json.dumps(
                    {
                        "action": "room_created",
                        "data": {
                            "chat_id": str(chat.id),
                            "participants": participants,
                            "message": f"Room {chat.id} created successfully!",
                        },
                    },
                ),
            )
        except Chat.DoesNotExist:
            logger.debug("Chat Room %s does not exist.", chat_id)
