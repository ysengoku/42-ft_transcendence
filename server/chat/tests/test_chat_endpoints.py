import logging
from unittest.mock import patch

from django.test import TestCase

from chat.models import Chat, ChatMessage
from users.models import User


class ChatEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user1 = User.objects.create_user("User1", email="user1@example.com", password="TestPassword123")
        self.user2 = User.objects.create_user("User2", email="user2@example.com", password="TestPassword123")
        self.user3 = User.objects.create_user("User3", email="user3@example.com", password="TestPassword123")
        
        # Login as user1 by default
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "User1", "password": "TestPassword123"},
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    def test_get_chats_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/chats")
        self.assertEqual(response.status_code, 401)

    def test_get_chats_empty_list(self):
        response = self.client.get("/api/chats")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 0)
        self.assertEqual(len(response_data["items"]), 0)

    def test_get_chats_with_existing_chats(self):
        # Create a chat with messages
        chat = Chat.objects.create()
        chat.participants.add(self.user1.profile, self.user2.profile)
        ChatMessage.objects.create(
            chat=chat,
            sender=self.user2.profile,
            content="Hello User1!"
        )
        
        response = self.client.get("/api/chats")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 1)
        self.assertEqual(len(response_data["items"]), 1)
        
        chat_preview = response_data["items"][0]
        self.assertEqual(chat_preview["username"], "User2")
        self.assertEqual(chat_preview["last_message"]["content"], "Hello User1!")

    def test_get_chats_pagination(self):
        # Create multiple chats
        for i in range(15):
            user = User.objects.create_user(f"ChatUser{i}", email=f"chatuser{i}@example.com", password="test123")
            chat = Chat.objects.create()
            chat.participants.add(self.user1.profile, user.profile)
            ChatMessage.objects.create(
                chat=chat,
                sender=user.profile,
                content=f"Message from user {i}"
            )
        
        # Test first page
        response = self.client.get("/api/chats?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test second page
        response = self.client.get("/api/chats?limit=10&offset=10")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 5)

    def test_get_or_create_chat_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.put("/api/chats/User2")
        self.assertEqual(response.status_code, 401)

    def test_get_or_create_chat_with_nonexistent_user(self):
        response = self.client.put("/api/chats/NonExistentUser")
        self.assertEqual(response.status_code, 404)

    def test_get_or_create_chat_with_self(self):
        response = self.client.put("/api/chats/User1")
        self.assertEqual(response.status_code, 422)
        self.assertContains(response, "Cannot get chat with yourself.", status_code=422)

    @patch("chat.router.endpoints.chats.async_to_sync")
    def test_create_new_chat(self, mock_async_to_sync):
        # Mock the channel layer send
        mock_async_to_sync.return_value = lambda *args, **kwargs: None
        
        response = self.client.put("/api/chats/User2")
        self.assertEqual(response.status_code, 201)
        
        response_data = response.json()
        self.assertEqual(response_data["username"], "User2")
        self.assertEqual(response_data["nickname"], "User2")
        self.assertEqual(len(response_data["messages"]), 0)
        
        # Verify chat was created in database
        self.assertTrue(Chat.objects.filter(
            participants__in=[self.user1.profile, self.user2.profile]
        ).exists())

    @patch("chat.router.endpoints.chats.async_to_sync")
    def test_get_existing_chat(self, mock_async_to_sync):
        # Create existing chat with messages
        chat = Chat.objects.create()
        chat.participants.add(self.user1.profile, self.user2.profile)
        message1 = ChatMessage.objects.create(
            chat=chat,
            sender=self.user1.profile,
            content="Hello User2!"
        )
        message2 = ChatMessage.objects.create(
            chat=chat,
            sender=self.user2.profile,
            content="Hello User1!"
        )
        
        response = self.client.put("/api/chats/User2")
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        self.assertEqual(response_data["username"], "User2")
        self.assertEqual(len(response_data["messages"]), 2)
        
        # Verify channel layer send was not called for existing chat
        mock_async_to_sync.assert_not_called()

    def test_get_messages_while_logged_out(self):
        self.client.delete("/api/logout")
        response = self.client.get("/api/chats/User2/messages")
        self.assertEqual(response.status_code, 401)

    def test_get_messages_with_nonexistent_user(self):
        response = self.client.get("/api/chats/NonExistentUser/messages")
        self.assertEqual(response.status_code, 404)

    def test_get_messages_with_self(self):
        response = self.client.get("/api/chats/User1/messages")
        self.assertEqual(response.status_code, 422)
        self.assertContains(response, "Cannot get messages with yourself.", status_code=422)

    def test_get_messages_with_no_existing_chat(self):
        response = self.client.get("/api/chats/User2/messages")
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "Chat with", status_code=404)
        self.assertContains(response, "was not found.", status_code=404)

    def test_get_messages_with_existing_chat(self):
        # Create chat with messages
        chat = Chat.objects.create()
        chat.participants.add(self.user1.profile, self.user2.profile)
        message1 = ChatMessage.objects.create(
            chat=chat,
            sender=self.user1.profile,
            content="Hello User2!"
        )
        message2 = ChatMessage.objects.create(
            chat=chat,
            sender=self.user2.profile,
            content="Hello User1!"
        )
        message3 = ChatMessage.objects.create(
            chat=chat,
            sender=self.user1.profile,
            content="How are you?"
        )
        
        response = self.client.get("/api/chats/User2/messages")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["count"], 3)
        self.assertEqual(len(response_data["items"]), 3)
        
        # Check message content and senders (messages are returned in reverse chronological order)
        messages = response_data["items"]
        self.assertEqual(messages[0]["content"], "How are you?")
        self.assertEqual(messages[0]["sender"], "User1")
        self.assertEqual(messages[1]["content"], "Hello User1!")
        self.assertEqual(messages[1]["sender"], "User2")
        self.assertEqual(messages[2]["content"], "Hello User2!")
        self.assertEqual(messages[2]["sender"], "User1")

    def test_get_messages_pagination(self):
        # Create chat with many messages
        chat = Chat.objects.create()
        chat.participants.add(self.user1.profile, self.user2.profile)
        
        for i in range(25):
            ChatMessage.objects.create(
                chat=chat,
                sender=self.user1.profile if i % 2 == 0 else self.user2.profile,
                content=f"Message {i}"
            )
        
        # Test first page
        response = self.client.get("/api/chats/User2/messages?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test second page
        response = self.client.get("/api/chats/User2/messages?limit=10&offset=10")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 10)
        
        # Test third page
        response = self.client.get("/api/chats/User2/messages?limit=10&offset=20")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data["items"]), 5)

    def test_blocked_user_chat_access(self):
        # User1 blocks User2
        self.user1.profile.block_user(self.user2.profile)
        
        # Try to create/get chat with blocked user
        response = self.client.put("/api/chats/User2")
        self.assertEqual(response.status_code, 404)  # Should not find the blocked user
        
        # Try to get messages with blocked user
        response = self.client.get("/api/chats/User2/messages")
        self.assertEqual(response.status_code, 404)  # Should not find the blocked user
