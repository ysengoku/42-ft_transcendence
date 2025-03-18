import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from chat.models import Chat, ChatMessage


class UserEventsConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            self.close()

        self.chats = Chat.objects.all()
        for chat in self.chats:
            async_to_sync(self.channel_layer.group_add)("chat_" + str(chat.id), self.channel_name)

        self.accept()

        self.send(text_data=json.dumps({"message": "Welcome!"}))

    def disconnect(self, close_code):
        for chat in self.chats:
            async_to_sync(self.channel_layer.group_discard)("chat_" + str(chat.id), self.channel_name)

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get("action")

        match action:
            case "message":
                message, chat_id = text_data_json["message"], text_data_json["chat_id"]

                # security check: chat should exist
                chat = Chat.objects.filter(id=chat_id).first()
                if not chat:
                    return

                # security check: user should be in the chat
                is_in_chat = chat.participants.filter(id=self.user.profile.id).exists()
                if not is_in_chat:
                    return

                ChatMessage.objects.create(sender=self.user.profile, content=message, chat=chat)
                async_to_sync(self.channel_layer.group_send)("chat_" + chat_id, {
                    "type": "chat.message", "message": message,
                })

    # Receive message from room group
    def chat_message(self, event):
        message = event["message"]

        # Send message to WebSocket
        self.send(text_data=json.dumps({"message": message}))

