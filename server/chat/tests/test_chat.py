from django.contrib.auth import get_user_model
from django.test import TestCase

from chat.models import Chat, ChatMessage
from users.models import Profile

User = get_user_model()


class ChatTestCase(TestCase):

    def setUp(self):
        self.user1 = User.objects.create(
            username="user1", password="password1")
        self.user2 = User.objects.create(
            username="user2", password="password2")
        self.profile1, _ = Profile.objects.get_or_create(user=self.user1)
        self.profile2, _ = Profile.objects.get_or_create(user=self.user2)

    def test_chat_id_consistency(self):
        chat = Chat.objects.create()
        chat.participants.add(self.profile1, self.profile2)

        message = ChatMessage.objects.create(
            sender=self.profile1, content="Test message", chat=chat,
        )

        assert message.chat.id == chat.id
