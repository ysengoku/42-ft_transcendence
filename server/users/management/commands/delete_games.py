from django.core.management.base import BaseCommand

from chat.models import Notification
from pong.models import GameRoom, GameRoomPlayer
from tournaments.models import Tournament


class Command(BaseCommand):
    help = "Put all pending GameRooms to closed and suppress all GameRoomPlayers"

    def handle(self, *args, **options):
        GameRoom.objects.all().delete()
        deleted, _ = GameRoomPlayer.objects.all().delete()
        Notification.objects.all().delete()
        Tournament.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("All pending games has been close and GameRoomPlayer were deleted"))
