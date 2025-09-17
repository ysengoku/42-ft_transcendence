import json
import logging
from datetime import datetime

from asgiref.sync import async_to_sync
from django.conf import settings
from django.db import transaction

from common.close_codes import CloseCodes
from pong.models import GameRoom
from users.models import Profile

from .models import GameInvitation, Notification
from .validator import Validator

logger = logging.getLogger("server")


class CancelMessages:
    ONGOING_GAME = "You are in an ongoing game."
    NO_INVITE_FROM_YOURSELF = "You can't accept invitations from yourself to a game !"
    INVITE_NOT_FOUND = "Invitation not found."
    NO_PENDING_INVITE = "No pending invitations found."
    INVITE_PENDING = "You have one invitation pending."


class DuelEvent:
    def __init__(self, consumer):
        self.consumer = consumer

    def reply_game_invite(self, data):
        response = data["data"].get("accept")
        if response is True:
            DuelEvent.accept_game_invite(self, data)
        elif response is False:
            DuelEvent.decline_game_invite(self, data)

    def create_game_room(self, profile1, profile2, settings):
        gameroom: GameRoom = GameRoom.objects.create(status=GameRoom.ONGOING)
        gameroom.add_player(profile1)
        gameroom.add_player(profile2)
        gameroom.settings = settings
        gameroom.save(update_fields=["settings"])
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

    def self_already_in_game(self, client_id):
        if any(self.consumer.user_profile.get_active_game_participation()):
            logger.warning("Error : user %s is in a game : can't join a game right now.", self.consumer.user.username)
            self.self_send_game_invite_cancelled(CancelMessages.ONGOING_GAME, client_id)
            return True
        return False

    def accept_game_invite(self, data):
        sender_name = data["data"].get("username")
        sender = Profile.objects.get(user__username=sender_name)
        client_id = data["data"].get("client_id")
        if sender == self.consumer.user.profile:
            logger.warning("Error : user %s wanted to accept a game with themself.", self.consumer.user.username)
            self.self_send_game_invite_cancelled(CancelMessages.NO_INVITE_FROM_YOURSELF, client_id)
            return

        if self.self_already_in_game(client_id):
            return
        try:
            invitation = GameInvitation.objects.get(
                sender=sender,
                recipient=self.consumer.user.profile,
                status=GameInvitation.PENDING,
            )
        except GameInvitation.DoesNotExist:
            logger.info(
                "No pending invitations sent by %s to cancel for user %s",
                sender.user.username,
                self.consumer.user.username,
            )
            self.self_send_game_invite_cancelled(CancelMessages.INVITE_NOT_FOUND, client_id)
            return
        except GameInvitation.MultipleObjectsReturned:
            logger.warning(
                "Multiple invitations sent by %s to user %s have the PENDING status !",
                sender.user.username,
                self.consumer.user.username,
            )
            return
        game_room = self.create_game_room(sender, self.consumer.user.profile, invitation.settings)
        invitation.status = GameInvitation.ACCEPTED
        invitation.save(update_fields=["status"])
        invitation.sync_notification_status()
        DuelEvent.cancel_all_send_game_invites(self.consumer.user.username)
        sender_data = self.data_for_game_found(sender, game_room.id)
        receiver_data = self.data_for_game_found(self.consumer.user.profile, game_room.id)
        async_to_sync(self.consumer.channel_layer.group_send)(f"user_{sender.user.id}", receiver_data)
        async_to_sync(self.consumer.channel_layer.group_send)(f"user_{self.consumer.user.id}", sender_data)

    def decline_game_invite(self, data):
        sender_name = data["data"].get("username")
        try:
            sender = Profile.objects.get(user__username=sender_name)
        except Profile.DoesNotExist:
            logger.warning("The invitation sender deleted their profile : %s", sender_name)
            return
        invitations = GameInvitation.objects.filter(
            sender=sender,
            recipient=self.consumer.user.profile,
            status=GameInvitation.PENDING,
        )
        if not invitations.exists():
            logger.info("No pending invitations sent by %s to cancel for user %s", sender, self.consumer.user.username)
            self.self_send_game_invite_cancelled(CancelMessages.NO_PENDING_INVITE)
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.DECLINED
                invitation.save(update_fields=["status"])
                invitation.sync_notification_status()
                count += 1
            logger.info(
                "Declined %d pending invitations from %s to %s",
                count,
                sender_name,
                self.consumer.user.username,
            )
        self.self_send_game_declined(self.consumer.user.username, self.consumer.user.nickname)
        notification_data = self.consumer.user_profile.get_user_data_with_date()
        notification_data.update({"status": "declined"})
        self.group_send_game_declined(invitation, self.consumer.user.username, self.consumer.user.nickname)

    def group_send_game_declined(self, invitation, username, nickname):
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"user_{invitation.sender.user.id}",
            {
                "type": "user_status",
                "action": "game_declined",
                "data": {
                    "username": username,
                    "nickname": nickname,
                },
            },
        )

    def self_send_game_declined(self, username, nickname, client_id=None):
        data = {
            "action": "game_declined",
            "data": {
                "username": username,
                "nickname": nickname,
            },
        }
        if client_id is not None:
            data["client_id"] = client_id
        self.consumer.send(text_data=json.dumps(data))

    def self_send_game_invite_cancelled(self, message, client_id=None):
        data = {
            "message": message,
        }
        if client_id is not None:
            data["client_id"] = client_id
        self.send_ws_message_to_user(self.consumer.user_profile, "game_invite_canceled", data)

    def send_game_invite(self, data):
        settings = data["data"].get("settings", {})
        client_id = data["data"].get("client_id")
        if settings is not None and not Validator.validate_settings(settings):
            self.consumer.close(CloseCodes.BAD_DATA)
            return
        receiver_username = data["data"].get("username")
        if receiver_username == self.consumer.user.username:
            logger.warning("User %s wanted to play with themself.", self.consumer.user.username)
            self.self_send_game_invite_cancelled("You can't invite yourself to a game !", client_id)
            return

        try:
            receiver = Profile.objects.get(user__username=receiver_username)
        except Profile.DoesNotExist as e:
            logger.error("Profile does not exist : %s", str(e))
            return

        if self.self_already_in_game(client_id):
            return

        if GameInvitation.objects.filter(sender=self.consumer.user_profile, status=GameInvitation.PENDING).exists():
            logger.warning("user %s has more than one pending invitation.", self.consumer.user.username)
            self.self_send_game_invite_cancelled(CancelMessages.INVITE_PENDING, client_id)
            return
        if GameInvitation.objects.filter(
            sender=receiver,
            recipient=self.consumer.user_profile,
            status=GameInvitation.PENDING,
        ).exists():
            logger.warning(
                "user %s is already invited by %s, deleting the invite...",
                receiver_username,
                self.consumer.user.username,
            )
            DuelEvent.decline_game_invite(self, data)
        invitation = GameInvitation.objects.create(
            sender=self.consumer.user_profile,
            recipient=receiver,
            invitee=receiver,
            settings=settings,
        )
        self.consumer.user_profile.refresh_from_db()
        self.create_and_send_game_notifications(
            self.consumer.user_profile,
            receiver,
            str(invitation.id),
            client_id,
            settings,
        )

    def create_and_send_game_notifications(self, sender, receiver, invitation_id, client_id, settings):
        notification = Notification.objects.action_send_game_invite(
            receiver=receiver,
            sender=sender,
            invitee=receiver,
            notification_data={"game_id": invitation_id, "client_id": str(client_id), "settings": settings},
        )
        notification_data = notification.data.copy()
        notification_data["id"] = str(notification.id)
        # Convert date in good format
        if "date" in notification_data and isinstance(notification_data["date"], datetime):
            notification_data["date"] = notification_data["date"].isoformat()
        self.send_ws_message_to_user(receiver, "game_invite", notification_data)
        # Notification for the sender,to find and cancel their invitation if the receiver never replies
        Notification.objects.action_send_game_invite(
            receiver=sender,
            invitee=receiver,
            sender=self.consumer.user_profile,
            notification_data={"game_id": invitation_id, "client_id": str(client_id), "settings": settings},
        )

    def send_ws_message_to_user(self, user, action, notification_data):
        async_to_sync(self.consumer.channel_layer.group_send)(
            f"user_{user.user.id}",
            {
                "type": "chat_message",
                "message": json.dumps(
                    {
                        "action": action,
                        "data": notification_data,
                    },
                ),
            },
        )

    def cancel_game_invite(self, data):
        target_username = data["data"].get("username")
        try:
            receiver = Profile.objects.get(user__username=target_username)
        except Profile.DoesNotExist as e:
            logger.error("Profile does not exist : %s", str(e))
            return
        try:
            invitation = GameInvitation.objects.get(
                sender=self.consumer.user.profile,
                recipient=receiver,
                status=GameInvitation.PENDING,
            )
        except GameInvitation.DoesNotExist as e:
            logger.error(
                "No pending invitations to cancel from %s to %s : %s",
                self.consumer.user.username,
                target_username,
                e,
            )
            return
        with transaction.atomic():
            invitation.status = GameInvitation.CANCELLED
            invitation.save(update_fields=["status"])
            invitation.sync_notification_status()
        logger.info("Cancelled pending invitations from user %s to %s", self.consumer.user.username, target_username)
        notification_data = {
            "username": self.consumer.user.username,
            "nickname": self.consumer.user.nickname,
        }
        self.send_ws_message_to_user(self.consumer.user_profile, "game_invite_canceled", notification_data)
        self.send_ws_message_to_user(receiver, "game_invite_canceled", notification_data)

    @staticmethod
    def cancel_all_send_game_invites(username):
        try:
            profile = Profile.objects.get(user__username=username)
        except Profile.DoesNotExist:
            logger.warning("Profile for user %s does not exists.", username)
        invitations = GameInvitation.objects.filter(sender=profile, status=GameInvitation.PENDING)
        if not invitations.exists():
            logger.info("No pending invitations to cancel for user %s", username)
            return
        with transaction.atomic():
            count = 0
            for invitation in invitations:
                invitation.status = GameInvitation.CANCELLED
                invitation.save(update_fields=["status"])
                invitation.sync_notification_status()
                count += 1
            logger.info("Cancelled %d pending invitations for user %s", count, username)
