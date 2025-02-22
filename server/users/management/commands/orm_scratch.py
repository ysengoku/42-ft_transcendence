from django.core.management.base import BaseCommand

from chat.models import Chat, ChatMessage
from users.models import Profile


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        u1 = Profile.objects.for_username("celiastral").first()
        u3 = Profile.objects.for_username("emuminov").first()

        m = ChatMessage(
            content=f"Test message {ChatMessage.objects.all().count()}",
            sender=u3,
            chat=Chat.objects.for_exact_participants(u1, u3).first(),
        )
        m.save()

        u1.blocked_users.remove(u3)
        u3.blocked_users.remove(u1)
