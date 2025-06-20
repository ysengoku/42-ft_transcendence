import logging

from django.core.management.base import BaseCommand

from pong.models import GameRoom, GameRoomPlayer
from chat.models import Notification
from tournaments.models import Tournament


class Command(BaseCommand):
    help = "Put all pending GameRooms to closed and suppress all GameRoomPlayers"

    def handle(self, *args, **options):
        # Close all pending GameRooms
        pending_rooms = GameRoom.objects.filter(status=GameRoom.PENDING)
        for room in pending_rooms:
            room.close()

        # Suppress link player/game
        deleted, _ = GameRoomPlayer.objects.all().delete()
        Notification.objects.all().delete()
        Tournament.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"All pending games has been close and GameRoomPlayer were deleted"))
