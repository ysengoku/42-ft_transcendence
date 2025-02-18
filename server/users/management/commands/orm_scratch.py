from django.core.management.base import BaseCommand

from chat.models import Chat, Message
from users.models import Profile


class Command(BaseCommand):
    help = "Creates application data"

    def handle(self, **kwargs) -> None:
        u1 = Profile.objects.for_username("celiastral").first()
        u2 = Profile.objects.for_username("fannybooboo").first()
        u3 = Profile.objects.for_username("emuminov").first()

        m = Message(
            content=f"Test message {Message.objects.all().count()}",
            sender=u1,
            chat=Chat.objects.for_exact_participants(u1, u2).first(),
        )
        m.save()

        print(Chat.objects.with_last_message().first())
