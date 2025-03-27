import pytest
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save

from chat.models import Chat, ChatMessage
from users.models import Profile

User = get_user_model()


post_save.disconnect(Profile.objects.create, sender=User)


@pytest.mark.django_db
def test_chat_id_consistency():
    # Setup : Créer deux utilisateurs et leurs profils
    user1 = User.objects.create(username="user1", password="password1")
    user2 = User.objects.create(username="user2", password="password2")
    profile1 = Profile.objects.create(user=user1)
    profile2 = Profile.objects.create(user=user2)

    # Créer un chat entre les deux profils
    chat = Chat.objects.create()
    chat.participants.add(profile1, profile2)

    # Envoyer un message
    message = ChatMessage.objects.create(
        sender=profile1, content="Test message", chat=chat
    )

    # Vérifier que le chat_id du message correspond au chat créé
    assert message.chat.id == chat.id
