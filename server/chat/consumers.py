import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from chat.models import Chat, ChatMessage, GameInvitation, Notification
from users.models import Profile


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
        # Add user's channel to personal group to receive answers to invitations sent
        async_to_sync(self.channel_layer.group_add)(
            f"user_{self.user.id}", self.channel_name
        )

        self.user_profile = self.user.profile
        self.chats = Chat.objects.for_participants(self.user_profile)

        for chat in self.chats:
            async_to_sync(self.channel_layer.group_add)(
                "chat_" + str(chat.id), self.channel_name
            )

        self.accept()

    def disconnect(self, close_code):
        # verify if self.chats exists and is not empty
        if hasattr(self, "chats") and self.chats:
            for chat in self.chats:
                async_to_sync(self.channel_layer.group_discard)(
                    "chat_" + str(chat.id), self.channel_name
                )

    # Receive message from WebSocket

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get("action")

        match action:
            case "new_message":
                self.handle_message(text_data_json)
            case "notification":
                self.handle_notification(text_data_json)
            case ("user_offline", "user_online"):
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
            case _:
                print(f"Unknown action : {action}")

    def handle_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        chat_id = message_data.get("chat_id")
        # security check: chat should exist
        chat = Chat.objects.filter(id=chat_id).first()
        if not chat:
            return

        # security check: user should be in the chat
        is_in_chat = chat.participants.filter(id=self.user_profile.id).exists()
        if not is_in_chat:
            return

        ChatMessage.objects.create(sender=self.user_profile, content=message, chat=chat)
        async_to_sync(self.channel_layer.group_send)(
            "chat_" + chat_id,
            {
                "type": "chat.message",
                "message": json.dumps(
                    {
                        "action": "new_message",
                        "data": {
                            "chat_id": str(ChatMessage.objects.latest("chat_id").pk),
                            "id": str(ChatMessage.objects.latest("id").pk),
                            "content": message,
                            "date": ChatMessage.objects.latest("id").date.isoformat(),
                            "sender": self.user_profile.user.username,
                            "is_read": False,
                            "is_liked": False,
                        },
                    }
                ),
            },
        )

    def handle_online_status(self, data):
        user_data = data.get("data", {})
        username = user_data.get("username")
        status = data.get("action")

        try:
            profile = Profile.objects.get(user__username=username)
        except Profile.DoesNotExist:
            print(f"Profile for {username} does not exist.")
            return

        notification_data = get_user_data(profile)
        if status == "user_online":
            self.send(
                text_data=json.dumps(
                    {
                        "type": "user_online",
                        "data": notification_data,
                    }
                )
            )
        elif status == "user_offline":
            self.send(
                text_data=json.dumps(
                    {
                        "type": "user_offline",
                        "data": notification_data,
                    }
                )
            )

    def handle_like_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        message_id = message_data.get["id"]
        if data["sender"] != self.username:  # prevent from liking own message
            try:
                message = ChatMessage.objects.get(pk=message_id)
                message.is_liked = True
                message.save()
                self.send(
                    text_data=json.dumps(
                        {
                            "type": "like_message",
                            "data": {
                                "id": message_id,
                                # "chat_id": message_id, HOW TO SEND THIS
                            },
                        }
                    )
                )
                # if user on the chat, sends to client
            except ObjectDoesNotExist:
                print(f"Message {message_id} does not exist.")
                self.send(
                    text_data=json.dumps(
                        {
                            "type": "error",
                            "message": "Message not found.",
                        }
                    )
                )

    def handle_unlike_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        message_id = message_data.get["id"]
        if data["sender"] != self.username:  # prevent from unliking own message
            try:
                message = ChatMessage.objects.get(pk=message_id)
                message.is_liked = False
                message.save()
                self.send(
                    text_data=json.dumps(
                        {
                            "type": "unlike_message",
                            "data": {
                                "id": message_id,
                                # "chat_id": message_id, HOW TO SEND THIS YUKO NEEDS IT
                            },
                        }
                    )
                )
            except ObjectDoesNotExist:
                print(f"Message {message_id} does not exist.")
                self.send(
                    text_data=json.dumps(
                        {
                            "type": "error",
                            "message": "Message not found.",
                        }
                    )
                )

    def handle_read_message(self, data):
        message_data = data.get("data", {})
        message_id = message_data.get["id"]
        try:
            message = ChatMessage.objects.get(pk=message_id)
            message.is_read = True
            message.save()
            self.send(
                text_data=json.dumps(
                    {
                        "type": "read_message",
                        "data": {
                            "id": message_id,
                        },
                    }
                )
            )
        except ObjectDoesNotExist:
            print(f"Message {message_id} does not exist.")

    # Receive message from room group
    def chat_message(self, event):
        message = event["message"]
        # Send message to WebSocket
        try:
            json.loads(message)
            self.send(text_data=message)
        except json.JSONDecodeError:
            self.send(text_data=json.dumps({"message": message}))

    def handle_notification(self, data):
        notification_data = data["notification"]
        notification_type = data["type"]
        notification_id = data.get("notification_id")

        # Create the notification in the db
        if notification_id is None:
            Notification.objects.create(
                user=self.user, message=notification_data, type=notification_type
            )
        else:
            try:
                notification = Notification.objects.get(id=notification_id)
                notification.read = True
                notification.save()
            except Notification.DoesNotExist:
                print(f"Notification {notification_id} does not exist.")

        self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "data": notification_data,
                    "type_notification": notification_type,
                }
            )
        )

    def accept_game_invite(self, data):
        invitation_id = data["invitation_id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "accepted"
            invitation.save()
            # send notif to sender of the game invitation with receivers' infos
            notification_data = get_user_data(self.user_profile)
            notification_data.update({"id": str(invitation_id), "status": "accepted"})
            async_to_sync(self.channel_layer.group_send)(
                f"user_{invitation.sender.id}",
                {
                    "type": "game_invite",
                    "data": notification_data,
                },
            )

            self.send(
                text_data=json.dumps(
                    {
                        "type": "game_invite",
                        "data": {"id": invitation_id, "status": "accepted"},
                    }
                )
            )
        except GameInvitation.DoesNotExist:
            print(f"Invitation {invitation_id} does not exist.")
            self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Invitation not found.",
                    }
                )
            )

    def decline_game_invite(self, data):
        invitation_id = data["invitation_id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "declined"
            invitation.save()
            # send notif to sender of the game invitation
            notification_data = get_user_data(self.user_profile)
            notification_data.update({"id": str(invitation_id), "status": "declined"})
            async_to_sync(self.channel_layer.group_send)(
                f"user_{invitation.sender.id}",
                {
                    "type": "game_invite",
                    "data": notification_data,
                },
            )
            self.send(
                text_data=json.dumps(
                    {
                        "type": "game_invite",
                        "data": {"id": invitation_id, "status": "declined"},
                    }
                )
            )
        except GameInvitation.DoesNotExist:
            print(f"Invitation {invitation_id} does not exist.")
            self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Invitation not found.",
                    }
                )
            )

    def send_game_invite(self, data):
        sender_id = data["sender_id"]
        receiver_id = data["receiver_id"]

        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        invitation = GameInvitation.objects.create(
            sender=sender, game_session=None, recipient=receiver
        )

        # Envoyer une notification au destinataire
        notification_data = get_user_data(sender)
        notification_data.update({"id": str(invitation.id)})

        async_to_sync(self.channel_layer.group_send)(
            f"user_{receiver_id}",
            {
                "type": "game_invite",
                "data": notification_data,
            },
        )

        self.send(
            text_data=json.dumps(
                {
                    "type": "game_invite",
                    "data": notification_data,
                }
            )
        )

    def handle_new_tournament(self, data):
        tournament_id = data["tournament_id"]
        tournament_name = data["tournament_name"]
        organizer_id = data["organizer_id"]

        organizer = Profile.objects.get(id=organizer_id)

        # send notification to concerned users
        notification_data = get_user_data(organizer)
        notification_data.update(
            {"id": tournament_id, "tournament_name": tournament_name}
        )

        self.send(
            text_data=json.dumps(
                {
                    "type": "new_tournament",
                    "data": notification_data,
                }
            )
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
                "type": "new_friend",
                "data": notification_data,
            },
        )
