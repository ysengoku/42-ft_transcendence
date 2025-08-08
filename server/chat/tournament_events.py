import json
import logging
from datetime import datetime

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from chat.validator import Validator
from tournaments.models import Tournament
from users.models import Profile

from .models import Notification, TournamentInvitation

logger = logging.getLogger("server")


class TournamentEvent:
    def __init__(self, consumer):
        self.consumer = consumer

    @classmethod
    def send_tournament_notification(cls, tournament_id, alias):
        if tournament_id is None or not Validator.is_valid_uuid(tournament_id):
            logger.warning("Wrong tournament_id send by the alias %s", alias)
            return
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            tournament_name = tournament.name
            tournament_creator = tournament.creator
        except Tournament.DoesNotExist:
            logger.warning("This tournament does not exist")
            return

        all_profiles = Profile.objects.exclude(pk=tournament_creator.pk)

        channel_layer = get_channel_layer()

        for profile in all_profiles:
            invitation = TournamentInvitation.objects.create(
                sender=tournament_creator,
                recipient=profile,
                tournament_id=str(tournament_id),
                tournament_name=tournament_name,
                alias=alias,
                status=TournamentInvitation.OPEN,
            )
            tournament_creator.refresh_from_db()
            notification = Notification.objects.action_send_tournament_invite(
                receiver=profile,
                sender=tournament_creator,
                notification_data={
                    "tournament_id": str(tournament_id),
                    "tournament_name": tournament_name,
                    "alias": alias,
                    "invitation_id": str(invitation.id),
                },
            )
            notification_data = notification.data.copy()
            if "date" in notification_data and isinstance(notification_data["date"], datetime):
                notification_data["date"] = notification_data["date"].isoformat()
            async_to_sync(channel_layer.group_send)(
                f"user_{profile.user.id}",
                {
                    "type": "chat_message",
                    "message": json.dumps(
                        {
                            "action": "new_tournament",
                            "data": notification_data,
                        },
                    ),
                },
            )

    @classmethod
    def close_tournament_invitations(cls, tournament_id):
        TournamentInvitation.objects.filter(
            tournament_id=tournament_id,
            status=TournamentInvitation.OPEN,
        ).update(status=TournamentInvitation.CLOSED)

        notifications = Notification.objects.filter(
            data__tournament_id=str(tournament_id),
            action=Notification.NEW_TOURNAMENT,
        )

        for notif in notifications:
            notif.data["status"] = TournamentInvitation.CLOSED
            notif.is_read = True
            notif.save(update_fields=["data", "is_read"])
