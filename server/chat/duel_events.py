import json
import logging
from datetime import datetime

from asgiref.sync import async_to_sync
from django.conf import settings
from django.db import transaction
from django.db.models import Q

from channels.layers import get_channel_layer

from pong.models import GameRoom, GameRoomPlayer
from users.models import Profile

from .chat_utils import ChatUtils
from .models import GameInvitation, Notification
from .validator import Validator

logger = logging.getLogger("server")


class DuelEvent:
    def __init__(self, consumer):
        self.consumer = consumer

    def reply_game_invite(self, data):
        response = data["data"].get("accept")
        if response is True:
            DuelEvent.accept_game_invite(self, data)
        elif response is False:
            DuelEvent.decline_game_invite(self, data)


    def create_game_room(self, profile1, profile2):
        gameroom = GameRoom.objects.create(status=GameRoom.ONGOING)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=profile1)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=profile2)
        return gameroom

    def data_for_game_found(self, player, game_id):
        return {
            "type": "game_found",
            "data": {
                "action": "game_accepted",
                "game_id": str(game_id),
                "username": player.user.username,
                "nickname": player.user.nickname,
                "avatar": player.profile_picture.url if player.profile_picture else settings.DEFAULT_USER_AVATAR,
                "elo": player.elo,
            },
        }

    def self_or_target_already_in_game(self, target, target_name, client_id):
        is_in_game: bool = (
            GameRoom.objects.for_players(self.consumer.user_profile).for_pending_or_ongoing_status().exists()
        )
        if is_in_game:
            logger.warning("Error : user %s is in a game : can't join a game right now.", self.consumer.user.username)
            self.consumer.send(text_data=json.dumps({
                "action": "game_invite_canceled",
                "message": "You are in an ongoing game",
                "client_id": client_id,
            }))
            return True
        target_is_in_game: bool = (
            GameRoom.objects.for_players(target).for_pending_or_ongoing_status().exists()
        )
        if target_is_in_game:
            logger.warning("Error : user %s is in a game : can't join a game right now.", target_name)
            self.consumer.send(text_data=json.dumps({
                "action": "game_invite_canceled",
                "message": "Your partner is in an ongoing game",
                "client_id": client_id,
            }))
            return True
        return False

    def accept_game_invite(self, data):
        sender_name = data["data"].get("username")
        sender = Profile.objects.get(user__username=sender_name)
        client_id = data["data"].get("client_id")
        if sender == self.consumer.user.profile:
            logger.warning("Error : user %s wanted to accept a game with themself.", self.consumer.user.username)
            self.consumer.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite_canceled",
                        "message": "You can't accept invitations from yourself to a game !",
                        "client_id": client_id,
                    },
                ),
            )
            return

        if self.self_or_target_already_in_game(sender, sender_name, client_id):
            return
        try:
            invitation = GameInvitation.objects.get(
                sender=sender,
                recipient=self.consumer.user.profile,
                status=GameInvitation.PENDING,
            )
        except GameInvitation.DoesNotExist:
            logger.debug(
                "No pending invitations sent by %s to cancel for user %s",
                sender.user.username, self.consumer.user.username,
            )
            self.consumer.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite_canceled",
                        "message": "Invitation not found.",
                    },
                ),
            )
            return
        except GameInvitation.MultipleObjectsReturned:
            logger.warning(
                "Multiple invitations sent by %s to user %s have the PENDING status !",
                sender.user.username,
                self.consumer.user.username,
            )
            return
        game_room = self.create_game_room(sender, self.consumer.user.profile)
        invitation.status = GameInvitation.ACCEPTED
        invitation.save()

        invitation.sync_notification_status()
        self.cancel_game_invite()
        # if any invitations were send by the user, they are cancelled because they are in a game now
        sender_data = self.data_for_game_found(sender, game_room.id)
        receiver_data = self.data_for_game_found(self.consumer.user.profile, game_room.id)
        async_to_sync(self.consumer.channel_layer.group_send)(f"user_{sender.user.id}", receiver_data)
        async_to_sync(self.consumer.channel_layer.group_send)(f"user_{self.consumer.user.id}", sender_data)

    # TODO : security checks
    def decline_game_invite(self, data):
        sender_name = data["data"].get("username")
        try:
            sender = Profile.objects.get(user__username=sender_name)
        except Profile.DoesNotExist as e:
            logger.warning("The invitation sender deleted their profile : %s", sender_name)
            return
        invitations = GameInvitation.objects.filter(
            sender=sender,
            recipient=self.consumer.user.profile,
            status=GameInvitation.PENDING,
        )
        if not invitations.exists():
            logger.debug("No pending invitations sent by %s to cancel for user %s", sender, self.consumer.user.username)
            self.consumer.send(
                text_data=json.dumps(
                    {
                        "action": "game_invite_canceled",
                        "message": "No pending invitations found.",
                    },
                ),
            )
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.DECLINED
                invitation.save()
                invitation.sync_notification_status()
                count += 1
            logger.info("Declined %d pending invitations from %s to %s",
                        count, sender_name, self.consumer.user.username)
        self.consumer.send(
            text_data=json.dumps(
                {
                    "action": "game_declined",
                    "data": {
                        "username": self.consumer.user.username,
                        "nickname": self.consumer.user.nickname,
                    },
                },
            ),
        )
        notification_data = ChatUtils.get_user_data(self.consumer.user_profile)
        notification_data.update({"status": "declined"})
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"user_{invitation.sender.user.id}",
            {
                "type": "user_status",
                "action": "game_declined",
                "data": {
                    "username": self.consumer.user.username,
                    "nickname": self.consumer.user.nickname,
                },
            },
        )

    # TODO : security checks
    def self_send_game_invite_cancelled(self, message, client_id):
        self.consumer.send(
            text_data=json.dumps(
                {
                    "action": "game_invite_canceled",
                    "message": message,
                    "client_id": client_id,
                },
            ),
        )

    def send_game_invite(self, data):
        options = data["data"].get("options", {})
        client_id = data["data"].get("client_id")
        if options is not None and not Validator.validate_options(options):
            self.consumer.close()
            return
        receiver_username = data["data"].get("username")
        if receiver_username == self.consumer.user.username:
            logger.warning("Error : user %s wanted to play with themself.", self.consumer.user.username)
            self.self_send_game_invite_cancelled("You can't invite yourself to a game !", client_id)
            return

        client_id = data["data"].get("client_id")

        try:
            receiver = Profile.objects.get(user__username=receiver_username)
        except Profile.DoesNotExist as e:
            logger.error("Profile does not exist : %s", str(e))
            return

        if self.self_or_target_already_in_game(receiver, receiver_username, client_id):
            return

        if GameInvitation.objects.filter(sender=self.consumer.user_profile, status=GameInvitation.PENDING).exists():
            logger.warning("Error : user %s has more than one pending invitation.", self.consumer.user.username)
            self.self_send_game_invite_cancelled("You have one invitation pending.", client_id)
            return
        invitation = GameInvitation.objects.create(
            sender=self.consumer.user_profile,
            recipient=receiver,
            options=options,
        )
        self.consumer.user_profile.refresh_from_db()
        notification = Notification.objects.action_send_game_invite(
            receiver=receiver,
            sender=self.consumer.user_profile,
            notification_data={"game_id": str(invitation.id), "client_id": str(client_id)},
        )
        notification_data = notification.data.copy()
        notification_data["id"] = str(notification.id)
        # Convert date in good format
        if "date" in notification_data and isinstance(notification_data["date"], datetime):
            notification_data["date"] = notification_data["date"].isoformat()
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"user_{receiver.user.id}",
            {
                "type": "chat_message",
                "message": json.dumps(
                    {
                        "action": "game_invite",
                        "data": notification_data,
                    },
                ),
            },
        )

    def cancel_game_invite(self):
        invitations = GameInvitation.objects.filter(
            sender=self.consumer.user.profile,
            status=GameInvitation.PENDING,
        )
        if not invitations.exists():
            logger.info("No pending invitations to cancel for user %s", self.consumer.user.username)
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.CANCELLED
                receiver = invitation.recipient
                invitation.save()
                invitation.sync_notification_status()
                count += 1
            logger.info("Cancelled %d pending invitations for user %s", count, self.consumer.user.username)
        self.consumer.send(
            text_data=json.dumps(
                {
                    "action": "game_invite_canceled",
                    "data": {
                        "username": self.consumer.user.username,
                        "nickname": self.consumer.user.nickname,
                    },
                },
            ),
        )
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"user_{receiver.user.id}",
            {
                "type": "chat_message",
                "message": json.dumps(
                    {
                        "action": "game_invite_canceled",
                        "data": {
                            "username": self.consumer.user.username,
                            "nickname": self.consumer.user.nickname,
                        },
                    },
                ),
            },
        )

    @staticmethod
    def cancel_all_send_and_received_game_invites(username):
        try:
            profile = Profile.objects.get(user__username=username)
        except Profile.DoesNotExist:
            logger.warning("Profile for user %s does not exists.", username)
        invitations = GameInvitation.objects.filter(
            Q(sender=profile) | Q(recipient=profile),
            status=GameInvitation.PENDING,
        )
        if not invitations.exists():
            logger.info("No pending invitations to cancel for user %s", username)
            return
        channel_layer = get_channel_layer()
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.CANCELLED
                sender = invitation.sender
                nickname = invitation.sender.user.nickname
                receiver = invitation.recipient
                invitation.save()
                invitation.sync_notification_status()
                count += 1
                target = receiver if sender == profile else sender
            async_to_sync(channel_layer.group_send)(
                f"user_{target.user.id}",
                {
                    "type": "chat_message",
                    "message": json.dumps(
                        {
                            "action": "game_invite_canceled",
                            "data": {
                                "message": "The user deleted their profile",
                                "username": username,
                                "nickname": receiver.user.nickname,
                            },
                        },
                    ),
                },
            )
            logger.info("Cancelled %d pending invitations for user %s", count, username)


    def send_tournament_notification(self, data):
        # options = data["data"].get("options", {})
        tournament_id = data["data"].get("tournament_id")
        # if options is not None and not Validator.validate_options(options):
        #     self.consumer.close()
        #     return
        # receiver_username = data["data"].get("username")
        # if receiver_username == self.consumer.user.username:
        #     logger.warning("Error : user %s wanted to play with themself.", self.consumer.user.username)
        #     self.self_send_game_invite_cancelled("You can't invite yourself to a game !", client_id)
        #     return
        #
        # client_id = data["data"].get("client_id")
        #
        # try:
        #     receiver = Profile.objects.get(user__username=receiver_username)
        # except Profile.DoesNotExist as e:
        #     logger.error("Profile does not exist : %s", str(e))
        #     return
        #
        # if self.self_or_target_already_in_game(receiver, receiver_username, client_id):
        #     return
        #
        # if GameInvitation.objects.filter(sender=self.consumer.user_profile, status=GameInvitation.PENDING).exists():
        #     logger.warning("Error : user %s has more than one pending invitation.", self.consumer.user.username)
        #     self.self_send_game_invite_cancelled("You have one invitation pending.", client_id)
        #     return
        # invitation = TournamentInvitation.objects.create(
        #     sender=self.consumer.user_profile,
        #     # recipient=receiver,
        #     # options=options,
        # )
        # self.consumer.user_profile.refresh_from_db()
        # notification = Notification.objects.action_send_game_invite(
        #     receiver=receiver,
        #     sender=self.consumer.user_profile,
        #     notification_data={"game_id": str(invitation.id), "client_id": str(client_id)},
        # )
        # notification_data = notification.data.copy()
        # notification_data["id"] = str(notification.id)
        # # Convert date in good format
        # if "date" in notification_data and isinstance(notification_data["date"], datetime):
        #     notification_data["date"] = notification_data["date"].isoformat()
        # async_to_sync(self.consumer.channel_layer.group_send)(
        #     f"user_{receiver.user.id}",
        #     {
        #         "type": "chat_message",
        #         "message": json.dumps(
        #             {
        #                 "action": "game_invite",
        #                 "data": notification_data,
        #             },
        #         ),
        #     },
        # )

    def handle_new_tournament(self, data):
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
