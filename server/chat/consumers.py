import json
import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError, models, transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import now

from users.consumers import OnlineStatusConsumer, check_inactive_users, redis_status_manager
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
        if not self.user or not self.user.is_authenticated:
            self.close()
            return
        try:
            self.user_profile = self.user.profile
            max_connexions = 10
            with transaction.atomic():
                self.user_profile.refresh_from_db()
                if self.user_profile.nb_active_connexions >= max_connexions:
                    logger.warning("Too many simultaneous connexions for user %s", self.user.username)
                    self.close()
                    return
                self.user_profile.is_online = True
                self.user_profile.last_activity = timezone.now()
                self.user_profile.nb_active_connexions = models.F('nb_active_connexions') + 1
                self.user_profile.save(update_fields=['is_online', 'last_activity', 'nb_active_connexions'])
                self.user_profile.refresh_from_db()
                redis_status_manager.set_user_online(self.user.id)
                logger.info("User %s connected, now has %i active connexions", 
                          self.user.username, self.user_profile.nb_active_connexions)
            self.chats = Chat.objects.for_participants(self.user_profile)
            # Add user's channel to personal group to receive answers to invitations sent
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
            # Notifier tous les utilisateurs du changement de statut
            self.notify_online_status("online", self.user_profile)
            logger.info("User %s is now online with %i active connexions", 
                      self.user.username, self.user_profile.nb_active_connexions)

        except DatabaseError as e:
            logger.error("Database error during connect: %s", e)
            self.close()

    def disconnect(self, close_code):
        if hasattr(self, "user_profile"):
            try:
                with transaction.atomic():
                    self.user_profile.refresh_from_db()
                    logger.info("Disconnecting user %s, current connections: %i",
                              self.user.username, self.user_profile.nb_active_connexions)
                    if self.user_profile.nb_active_connexions > 0:
                        self.user_profile.nb_active_connexions = models.F('nb_active_connexions') - 1
                        self.user_profile.save(update_fields=['nb_active_connexions'])
                        self.user_profile.refresh_from_db()

                    if self.user_profile.nb_active_connexions == 0:
                        logger.info("Last connection closed for user %s, marking as offline", 
                                  self.user.username)
                        self.user_profile.is_online = False
                        self.user_profile.save(update_fields=['is_online'])
                        redis_status_manager.set_user_offline(self.user.id)
                        self.notify_online_status("offline", self.user_profile)
                    self.user_profile.update_activity()

            except DatabaseError as e:
                logger.error("Database error during disconnect: %s", e)

            logger.info("User %s now has %i active connexions",
                      self.user.username, self.user_profile.nb_active_connexions)

            # Retirer de tous les groupes
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

    def add_user_to_room(self, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id)
            async_to_sync(self.channel_layer.group_add)(
                f"chat_{chat.id}", self.channel_name,
            )
        except Chat.DoesNotExist:
            logger.debug("Char Room %s does not exist.", chat_id)

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

    def chat_created(self, event):
        self.send(text_data=json.dumps({
            "action": "chat_created",
            "data": event["data"],
        }))

    def notify_online_status(self, onlinestatus, user_profile=None):
        """
        Notify all users about a user's online status change
        """
        logger.info("Notifying status change for user %s to %s",
                  self.user.username, onlinestatus)
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
        
        # Envoyer la notification à tous les utilisateurs
        async_to_sync(self.channel_layer.group_send)(
            "online_users",
            {
                "type": "user_status",
                "action": action,
                "data": user_data,
            },
        )
        logger.info("Status change notification sent for user %s", self.user.username)

    # Receive message from WebSocket

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get("action")

        match action:
            case "new_message":
                self.handle_message(text_data_json)
            case "notification":
                self.handle_notification(text_data_json)
            case "user_offline" | "user_online":
                self.handle_online_status(text_data_json)
            case "like_message":
                self.handle_like_message(text_data_json)
            case "unlike_message":
                self.handle_unlike_message(text_data_json)
            case "read_message":
                self.handle_read_message(text_data_json)
            case "game_invite":
                self.send_game_invite(text_data_json)
            case "accept_game_invite":
                self.accept_game_invite(text_data_json)
            case "decline_game_invite":
                self.decline_game_invite(text_data_json)
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
                logger.error("Unknown action : %s", action)


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
        new_message = ChatMessage.objects.create(
            sender=self.user_profile, content=message, chat=chat)
        async_to_sync(self.channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "chat.message",
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
        sender = message_data.get("sender")
        if sender != self.user.username:  # prevent from liking own message
            try:
                with transaction.atomic():
                    message = ChatMessage.objects.select_for_update().get(pk=message_id)
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
        if sender != self.user.username:  # prevent from liking own message
            try:
                with transaction.atomic():
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
        notification_data = data["notification"]
        notification_type = data["type"]
        notification_id = data.get("notification_id")

        # Create the notification in the db
        if notification_id is None:
            Notification.objects.create(
                receiver=self.user,
                message=notification_data,
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

    def accept_game_invite(self, data):
        invitation_id = data["invitation_id"]
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
        invitation_id = data["invitation_id"]
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

        async_to_sync(self.channel_layer.group_send)(
            f"user_{receiver_id}",
            {
                "action": "new_friend",
                "data": notification_data,
            },
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
