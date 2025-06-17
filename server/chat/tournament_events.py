import json
import logging
from datetime import datetime

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from tournaments.models import Tournament
from users.models import Profile

from .chat_utils import ChatUtils
from .models import Notification, TournamentInvitation

logger = logging.getLogger("server")


class TournamentEvent:
    def __init__(self, consumer):
        self.consumer = consumer

    @classmethod
    def send_tournament_notification(cls, tournament_id, alias):
        # TODO: Verify tournament_id (is it UUID)
        if tournament_id is None:
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

        channel_layer = get_channel_layer()
        for notif in notifications:
            notif.data["status"] = TournamentInvitation.CLOSED
            notif.save(update_fields=["data"])

            # async_to_sync(channel_layer.group_send)(
            #     f"user_{notif.receiver.user.id}",
            #     {
            #         "type": "chat_message",
            #         "message": json.dumps(
            #             {
            #                 "action": "tournament_invitation_closed",
            #                 "data": notif.data | {"id": str(notif.id)},
            #             }
            #         ),
            #     },
            # )

    def handle_new_tournament(self, data):
        # TODO: Verify that this function is, indeed, useless and unused
        logger.info(data)
        logger.debug(data)
        logger.warning(data)
        logger.critical(data)
        logger.warning("HOLY SHIT WILL YOU PLEASE PRINT THIS ?")
        tournament_id = data["data"].get["tournament_id"]
        tournament_name = data["data"].get["tournament_name"]
        organizer_id = data["data"].get["organizer_id"]

        organizer = Profile.objects.get(id=organizer_id)

        # send notification to concerned users
        notification_data = ChatUtils.get_user_data(organizer)
        notification_data.update(
            {"id": tournament_id, "tournament_name": tournament_name},
        )

        self.consumer.send(
            text_data=json.dumps(
                {
                    "action": "new_tournament",
                    "data": notification_data,
                },
            ),
        )
