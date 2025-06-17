import json
import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from .models import Chat, ChatMessage

logger = logging.getLogger("server")


class ChatEvent:
    def __init__(self, consumer):
        self.consumer = consumer

    def join_chat(self, event):
        chat_id = event["data"]["chat_id"]
        try:
            async_to_sync(self.consumer.channel_layer.group_add)(
                f"chat_{chat_id}",
                self.consumer.channel_name,
            )
        except Chat.DoesNotExist:
            logger.debug("Acces denied to the chat %s for %s",
                         chat_id, self.consumer.user.username)

    def handle_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        chat_id = message_data.get("chat_id")

        # security check: chat should exist
        chat = (
            Chat.objects.for_participants(self.consumer.user_profile)
            .with_other_user_profile_info(self.consumer.user_profile)
            .filter(id=chat_id)
            .first()
        )
        if not chat:
            return

        # security check: user should be in the chat
        is_in_chat = chat.participants.filter(
            id=self.consumer.user_profile.id).exists()
        if not is_in_chat:
            return
        is_blocked = chat.is_blocked_user or chat.is_blocked_by_user
        if is_blocked:
            return
        # security check: message should not be longueur than 255
        if message is not None and len(message) > settings.MAX_MESSAGE_LENGTH:
            logger.warning(
                "Message too long (%d caracteres) from user %s in chat %s",
                len(message),
                self.consumer.user.username,
                chat_id,
            )
            return
        new_message = ChatMessage.objects.create(
            sender=self.consumer.user_profile, content=message, chat=chat)

        async_to_sync(self.consumer.channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "chat_message",
                "message": json.dumps(
                    {
                        "action": "new_message",
                        "data": {
                            "chat_id": str(chat.id),
                            "id": str(new_message.pk),
                            "content": message,
                            "date": new_message.date.isoformat(),
                            "sender": self.consumer.user_profile.user.username,
                            "is_read": False,
                            "is_liked": False,
                        },
                    },
                ),
            },
        )

    def handle_like_message(self, data):
        message_data = data.get("data", {})
        message = message_data.get("content")
        message_id = message_data.get("id")
        chat_id = message_data.get("chat_id")
        try:
            with transaction.atomic():
                message = ChatMessage.objects.select_for_update().get(pk=message_id)
                sender = message.sender.user.username
                if sender != self.consumer.user.username:  # prevent from liking own message
                    message.is_liked = True
                    message.save(update_fields=["is_liked"])
                    message.refresh_from_db()
                    transaction.on_commit(
                        lambda: self.consumer.send_like_update(chat_id, message_id, True))
                    self.consumer.send(
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
                if sender != self.consumer.user.username:  # prevent from unliking own message
                    message = ChatMessage.objects.select_for_update().get(pk=message_id)
                    message.is_liked = False
                    message.save(update_fields=["is_liked"])

                    message.refresh_from_db()
                    transaction.on_commit(
                        lambda: self.consumer.send_like_update(chat_id, message_id, False))

                    message.refresh_from_db()
                    self.consumer.send(
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

    def send_like_update(self, chat_id, message_id, is_liked):
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "chat.like_update",
                "message": json.dumps(
                    {
                        "action": "like_message",
                        "data": {
                            "id": str(message_id),
                            "chat_id": str(chat_id),
                            "is_liked": is_liked,
                        },
                    },
                ),
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
            self.consumer.send(text_data=message)
        except json.JSONDecodeError:
            self.consumer.send(text_data=json.dumps({"message": message}))

    def chat_like_update(self, event):
        """
        Handle actions send to chat websocket
        """
        message_data = json.loads(event["message"])
        self.consumer.send(
            text_data=json.dumps(
                {
                    "action": message_data["action"],
                    "data": message_data["data"],
                },
            ),
        )
