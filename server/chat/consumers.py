import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from chat.models import Chat, ChatMessage
from users.models import Profile


class UserEventsConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            self.close()
    # Add user's channel to personal group to receive answers to invitations sent
        async_to_sync(self.channel_layer.group_add)(
            f"user_{self.user.id}", self.channel_name)

        self.user_profile = self.user.profile
        self.chats = Chat.objects.for_participants(self.user_profile)

        for chat in self.chats:
            async_to_sync(self.channel_layer.group_add)(
                "chat_" + str(chat.id), self.channel_name)

        self.accept()

        self.send(text_data=json.dumps({"message": "Welcome!"}))

    def disconnect(self, close_code):
        for chat in self.chats:
            async_to_sync(self.channel_layer.group_discard)(
                "chat_" + str(chat.id), self.channel_name)

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get("action")

        match action:
            case "message":
                self.handle_message(text_data_json)
            case "notification":
                self.handle_notification(text_data_json)
            case "user_online":
                self.handle_online_status(text_data_json)
            case "user_offline":
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
        message, chat_id = data["message"], data["chat_id"]

        # security check: chat should exist
        chat = Chat.objects.filter(id=chat_id).first()
        if not chat:
            return

        # security check: user should be in the chat
        is_in_chat = chat.participants.filter(id=self.user_profile.id).exists()
        if not is_in_chat:
            return

        ChatMessage.objects.create(
            sender=self.user_profile, content=message, chat=chat)
        async_to_sync(self.channel_layer.group_send)("chat_" + chat_id, {
            "type": "chat.message",
            "message": json.dumps({
                "type": "message",
                "data": {
                    "id": str(ChatMessage.objects.latest("id").pk),
                    "content": message,
                    "date": ChatMessage.objects.latest("id").date.isoformat(),
                    "sender": self.user_profile.user.username,
                    "is_read": False,
                    "is_liked": False,
                }
            })
        })

    def handle_online_status(self, data):
        username = data["data"]["username"]
        status = data["action"]

        if status == "user_online":
            self.send(text_data=json.dumps({
                "type": "user_online",
                "data": {
                    "username": username,
                }
            }))
        elif status == "user_offline":
            self.send(text_data=json.dumps({
                "type": "user_offline",
                "data": {
                    "username": username,
                }
            }))

    def handle_like_message(self, data):
        message_id = data["message_id"]
        try:
            message = ChatMessage.objects.get(pk=message_id)
            message.is_liked = True
            message.save()
            self.send(text_data=json.dumps({
                "type": "like_message",
                "data": {
                    "id": message_id,
                }
            }))
        except ObjectDoesNotExist:
            print(f"Message {message_id} does not exist.")

    def handle_unlike_message(self, data):
        message_id = data["message_id"]
        try:
            message = ChatMessage.objects.get(pk=message_id)
            message.is_liked = False
            message.save()
            self.send(text_data=json.dumps({
                "type": "unlike_message",
                "data": {
                    "id": message_id,
                }
            }))
        except ObjectDoesNotExist:
            print(f"Message {message_id} does not exist.")

    def handle_read_message(self, data):
        message_id = data["message_id"]
        try:
            message = ChatMessage.objects.get(pk=message_id)
            message.is_read = True
            message.save()
            self.send(text_data=json.dumps({
                "type": "read_message",
                "data": {
                    "id": message_id,
                }
            }))
        except ObjectDoesNotExist:
            print(f"Message {message_id} does not exist.")

    # Receive message from room group
    def chat_message(self, event):
        message = event["message"]
        # Send message to WebSocket
        try:
            json.loads(message)
            # message already in JSON -> send
            self.send(text_data=message)
        except json.JSONDecodeError:
            # message no in JSON -> restructure and send
            self.send(text_data=json.dumps({"message": message}))
        # self.send(text_data=message)
        # message is created in handle_message :
        # -> it is already structured in json before being send
        # -> this function seems useless / reworking for nothing
        # self.send(text_data=json.dumps({"message": message}))
        # let the try / except just to be sure

    def handle_notification(self, data):
        notification_data = data["notification"]
        notification_type = data["type"]
        notification_id = data.get("notification_id")

        # Create the notification in the db
        if notification_id is None:
            Notification.objects.create(
                user=self.user, message=notification_data, type=notification_type)
        else:
            try:
                notification = Notification.objects.get(id=notification_id)
                notification.read = True
                notification.save()
            except Notification.DoesNotExist:
                print(f"Notification {notification_id} does not exist.")

        self.send(text_data=json.dumps({
            "type": "notification",
            "data": notification_data,
            "type_notification": notification_type
        }))

    def accept_game_invite(self, data):
        invitation_id = data["invitation_id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "accepted"
            invitation.save()
            # send notif to sender of the game invitation
            async_to_sync(self.channel_layer.group_send)(f"user_{invitation.sender.id}", {
                "type": "game_invite",
                "data": {"id": invitation_id, "status": "accepted"}
            })

            self.send(text_data=json.dumps({
                "type": "game_invite",
                "data": {"id": invitation_id, "status": "accepted"}
            }))
        except GameInvitation.DoesNotExist:
            print(f"Invitation {invitation_id} does not exist.")
            self.send(text_data=json.dumps({
                "type": "error",
                        "message": "Invitation not found."
            }))

    def decline_game_invite(self, data):
        invitation_id = data["invitation_id"]
        try:
            invitation = GameInvitation.objects.get(id=invitation_id)
            invitation.status = "declined"
            invitation.save()
            # send notif to sender of the game invitation
            async_to_sync(self.channel_layer.group_send)(f"user_{invitation.sender.id}", {
                "type": "game_invite",
                "data": {"id": invitation_id, "status": "declined"}
            })
            self.send(text_data=json.dumps({
                "type": "game_invite",
                "data": {"id": invitation_id, "status": "declined"}
            }))
        except GameInvitation.DoesNotExist:
            print(f"Invitation {invitation_id} does not exist.")
            self.send(text_data=json.dumps({
                "type": "error",
                        "message": "Invitation not found."
            }))

    def send_game_invite(self, event):
        sender_id = data["sender_id"]
        receiver_id = data["receiver_id"]

        GameInvitation.objects.create(
            sender_id=sender_id, receiver_id=receiver_id)

        self.send(text_data=json.dumps({
            "type": "game_invite",
            "data": {"sender_id": sender_id, "receiver_id": receiver_id}
        }))

    def handle_new_tournament(self, event):
        tournament_data = data["tournament_data"]
        # send notification to concerned users
        self.send(text_data=json.dumps({
            "type": "new_tournament",
            "data": tournament_data
        }))

    def add_new_friend(self, data):
        sender_id = data["sender_id"]
        receiver_id = data["receiver_id"]

        # Add direclty in friendlist
        sender = Profile.objects.get(id=sender_id)
        receiver = Profile.objects.get(id=receiver_id)

        # Verify if not already friend
        if not sender.friends.filter(id=receiver.id).exists():
            sender.friends.add(receiver)

        self.send(text_data=json.dumps({
            "type": "new_friend",
            "data": {"sender_id": sender_id, "receiver_id": receiver_id}
        }))
