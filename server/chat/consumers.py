import json
import logging
from datetime import datetime
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError, models, transaction
from django.utils import timezone

from users.consumers import OnlineStatusConsumer, redis_status_manager
from users.models import Profile

from .models import Chat, ChatMessage, GameInvitation, GameSession, Notification

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
        if not self.user or not self.user.is_authenticated:
            self.close()
            return
        try:
            self.user_profile = self.user.profile
        except AttributeError:
            logger.error("User %s has no profile", self.user.username)
            self.close()
            return

        # Increment the number of active connexions and get the new value
        max_connexions = 10
        try:
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                if self.user_profile.nb_active_connexions >= max_connexions:
                    logger.warning(
                        "Too many simultaneous connexions for user %s", self.user.username)
                    self.close()
                    return
                self.user_profile.nb_active_connexions = models.F(
                    "nb_active_connexions") + 1
                self.user_profile.update_activity()
                self.user_profile.save(update_fields=["nb_active_connexions"])
                self.user_profile.refresh_from_db()
                redis_status_manager.set_user_online(self.user.id)
                logger.info("User %s connected, now has %i active connexions",
                            self.user.username, self.user_profile.nb_active_connexions)
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
        logger.info("User %s has %s active connexions",
                    self.user.username, self.user_profile.nb_active_connexions)
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
            # Décrémenter le compteur de connexions et récupérer la nouvelle valeur
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                self.user_profile.nb_active_connexions = models.F(
                    "nb_active_connexions") - 1
                self.user_profile.save(update_fields=["nb_active_connexions"])
                self.user_profile.refresh_from_db()

                # S'assurer que le compteur ne devient pas négatif
                if self.user_profile.nb_active_connexions < 0:
                    self.user_profile.nb_active_connexions = 0
                    self.user_profile.save(
                        update_fields=["nb_active_connexions"])

                logger.info("User %s has %s active connexions",
                            self.user.username, self.user_profile.nb_active_connexions)
                # Marquer comme hors ligne uniquement si c'était la dernière connexion
                if self.user_profile.nb_active_connexions == 0:
                    self.user_profile.is_online = False
                    self.user_profile.save(update_fields=["is_online"])
                    redis_status_manager.set_user_offline(self.user.id)
                    OnlineStatusConsumer.notify_online_status(self, "offline")
                    logger.info("User %s is now offline (no more active connexions)",
                                self.user.username)

                    # Remove user from the groups only when they have no more active connections
                    async_to_sync(self.channel_layer.group_discard)(
                        "online_users",
                        self.channel_name,
                    )
                else:
                    logger.info("User %s still has %i active connexions",
                                self.user.username, self.user_profile.nb_active_connexions)

        except DatabaseError as e:
            logger.error("Database error during disconnect: %s", e)

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
            # "game_invite": {"id": str, "accept": bool},
        }

        uuid_fields = {
            "new_message": ["chat_id"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "read_notification": ["id"],
            # TODO : replace game_invite by reply_game_invite -->
            # "game_invite": ["id"],
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
                # "game_invite": ["receiver_id"],
                # "reply_game_invite": ["id", "accept"],
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
                case "read_notification":
                    self.read_notification(text_data_json)
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
                case "reply_game_invite":
                    self.reply_game_invite(text_data_json)
                case "game_accepted":
                    self.accept_game_invite(text_data_json)
                case "game_declined":
                    self.decline_game_invite(text_data_json)
                case "cancel_game_invite":
                    self.cancel_game_invite(text_data_json)
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
        if message is not None and len(message) > settings.MAX_MESSAGE_LENGTH:
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

    def read_notification(self, data):
        notification_id = data["data"].get("id")
        try:
            with transaction.atomic():
                notification = Notification.objects.get(id=notification_id)
                notification.is_read = True
                notification.save(update_fields=["is_read"])
        except Notification.DoesNotExist:
            logger.debug("Notification %s does not exist", notification_id)

    def reply_game_invite(self, data):
        response = data["data"].get("accept")
        if response == True:
            self.accept_game_invite(data)
        elif response == False:
            self.decline_game_invite(data)
        else:
            logger.critical("WHAT THE FUCK IS GOING ON WITH THE BOOLEAN ?")

    def accept_game_invite(self, data):
        sender_name = data["data"].get("username")
        sender = Profile.objects.get(user__username=sender_name)
        try:
            invitation = GameInvitation.objects.get(
                sender=sender,
                recipient=self.user.profile,
                status=GameInvitation.PENDING
            )
        except GameInvitation.DoesNotExist:
            logger.debug("No pending invitations sent by %s to cancel for user %s",
                         sender.user.username, self.user.username)
            self.send(
                text_data=json.dumps(
                    {
                        "action": "error",
                        "message": "Invitation not found.",
                    },
                ),
            )
            return
        except GameInvitation.MultipleObjectsReturned:
            logger.warning("Multiple invitations sent by %s to user %s have the PENDING status !",
                           sender.user.username, self.user.username)
            return
        game_session = GameSession.objects.create()
        # Link game session to invitation
        invitation.game_session = game_session
        invitation.status = GameInvitation.ACCEPTED
        invitation.save()
        invitation.sync_notification_status()
        # send notif to sender of the game invitation with receivers' infos
        notification_data = get_user_data(self.user_profile)
        notification_data.update({
            "game_id": str(game_session.id),
            "status": "accepted"
        })
        async_to_sync(self.channel_layer.group_send)(
            f"user_{invitation.sender.user.id}",
            {
                "type": "user_status",
                "action": "game_accepted",
                "data": notification_data,
            },
        )
        self.send(
            text_data=json.dumps(
                {
                    "action": "game_accepted",
                    "data": notification_data,
                },
            ),
        )

    # TODO : security checks
    def decline_game_invite(self, data):
        sender_name = data["data"].get("username")
        sender = Profile.objects.get(user__username=sender_name)
        invitations = GameInvitation.objects.filter(
            sender=sender,
            recipient=self.user.profile,
            status=GameInvitation.PENDING
        )
        if not invitations.exists():
            logger.debug("No pending invitations sent by %s to cancel for user %s", sender, self.user.username)
            self.send(
                text_data=json.dumps({
                    "action": "error",
                    "message": "No pending invitations found.",
                })
            )
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.DECLINED
                invitation.save()
                invitation.sync_notification_status()
                count += 1
            logger.info("Declined %d pending invitations from %s to %s", count, sender_name, self.user.username)
        self.send(
            text_data=json.dumps({
                "action": "game_declined",
                "data": {
                    "username": self.user.username,
                    "nickname": self.user.nickname,
                },
            })
        )
        notification_data = get_user_data(self.user_profile)
        notification_data.update({"status": "declined"})
        async_to_sync(self.channel_layer.group_send)(
            f"user_{invitation.sender.user.id}",
            {
                "type": "user_status",
                "action": "game_declined",
                "data": {
                    "username": self.user.username,
                    "nickname": self.user.nickname,
                },
            },
        )
        # self.send(
        #     text_data=json.dumps(
        #         {
        #             "action": "game_declined",
        #             "data": {"username": self.user.username, "nickname": self.user.nickname},
        #         },
        #     ),
        # )
        # try:
        #     invitation = GameInvitation.objects.get(
        #         sender=sender, receiver=self.user.profile, status=GameInvitation.PENDING)
        #     invitation.status = GameInvitation.DECLINED
        #     invitation.save()
        #     invitation.sync_notification_status()
        #     # send notif to sender of the game invitation
        #     notification_data = get_user_data(self.user_profile)
        #     notification_data.update(
        #         {"id": str(invitation_id), "status": "declined"})
        # except GameInvitation.DoesNotExist:
        #     logger.debug("Invitation %s does not exist.", invitation_id)
        #     self.send(
        #         text_data=json.dumps(
        #             {
        #                 "action": "error",
        #                 "message": "Invitation not found.",
        #             },
        #         ),
        #     )

    # TODO : security checks
    def send_game_invite(self, data):
        options = data["data"].get("options", {})
        receiver_username = data["data"].get("username")

        try:
            receiver = Profile.objects.get(user__username=receiver_username)
        except Profile.DoesNotExist as e:
            logger.error("Profile does not exist : %s", str(e))
            self.send(text_data=json.dumps({
                "action": "error",
                "message": "Invalid profile"
            }))
        if (GameInvitation.objects.filter(sender=self.user_profile, status=GameInvitation.PENDING).exists()):
            logger.warning("Error : user %s has more than one pending invitation.", self.user.username)
            self.send(text_data=json.dumps({
                "action": "game_invite_canceled",
                "message": "You have one invitation pending"
            }))
            return
        invitation = GameInvitation.objects.create(
            sender=self.user_profile,
            recipient=receiver,
            game_session=None,
            options=options,
        )

        notification = Notification.objects.action_send_game_invite(
            receiver=receiver,
            sender=self.user_profile,
            notification_data={"game_id": str(invitation.id)},
        )
        notification_data = notification.data.copy()
        notification_data["id"] = str(notification.id)
        # Convert date in good format
        if "date" in notification_data and isinstance(notification_data["date"], datetime):
            notification_data["date"] = notification_data["date"].isoformat()

        async_to_sync(self.channel_layer.group_send)(
            f"user_{receiver.user.id}",
            {
                "type": "chat_message",
                "message": json.dumps({
                    "action": "game_invite",
                    "data": notification_data,
                }),
            },
        )

    # TODO : security checks
    def cancel_game_invite(self, data):
        invitations = GameInvitation.objects.filter(
            sender=self.user.profile,
            status=GameInvitation.PENDING
        )
        if not invitations.exists():
            logger.debug("No pending invitations to cancel for user %s", self.user.username)
            self.send(
                text_data=json.dumps({
                    "action": "error",
                    "message": "No pending invitations found.",
                })
            )
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.CANCELLED
                receiver = invitation.recipient
                invitation.save()
                invitation.sync_notification_status()
                count += 1
            logger.info("Cancelled %d pending invitations for user %s", count, self.user.username)
        self.send(
            text_data=json.dumps({
                "action": "game_invite_canceled",
                "data": {
                    "username": self.user.username,
                    "nickname": self.user.nickname,
                }
            })
        )
        async_to_sync(self.channel_layer.group_send)(
            f"user_{receiver.user.id}",
            {
                "type": "chat_message",
                "message": json.dumps({
                    "action": "game_invite_canceled",
                    "data": {
                        "username": self.user.username,
                        "nickname": self.user.nickname
                    }
                }),
            },
        )

    def handle_new_tournament(self, data):
        tournament_id = data["data"].get["tournament_id"]
        tournament_name = data["data"].get["tournament_name"]
        organizer_id = data["data"].get["organizer_id"]

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
        sender_id = data["data"].get("sender_id")
        receiver_id = data["data"].get("receiver_id")
        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        # Verify if not already friend
        if not sender.friends.filter(id=receiver.id).exists():
            sender.friends.add(receiver)
        # Create notification
        notification = Notification.objects.action_new_friend(receiver, sender)

        notification_data = get_user_data(sender)
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
