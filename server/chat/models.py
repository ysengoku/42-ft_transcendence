import uuid
from datetime import datetime, timezone

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db.models import (
    BooleanField,
    Count,
    Exists,
    ExpressionWrapper,
    ImageField,
    OuterRef,
    Q,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce, Now, NullIf

from users.models import Profile


class ChatQuerySet(models.QuerySet):
    def create(self, *participants: Profile):
        """
        Creates a new Chat with specified participants.
        """
        chat = Chat()
        chat.save()
        chat.participants.set(participants)
        return chat

    def get_or_create(self, *participants: Profile):
        """
        Gets or creates a new Chat with specified participants if there aren't any.
        First returned value is chat, second one is bool which indicated whether or not the recourse was created or not.
        """
        chat = self.for_exact_participants(*participants).first()
        if not chat:
            chat = self.create(*participants)
            return chat, True
        return chat, False

    def for_participants(self, *participants: Profile):
        """
        Returns all the chats where at least one of the specified users participate.
        """
        return self.filter(participants__in=participants).distinct()

    def for_exact_participants(self, *participants: Profile):
        """
        Returns all the chats with specified users as participants.
        """
        qs = self.all()
        for participant in participants:
            qs = qs.filter(participants=participant)
        return qs.distinct()

    def with_and_order_by_last_message(self):
        """
        Annotates Chats with the last message and last message date and sorts them by the latter.
        Chat messages are sorted by the date by default, so there is no need to call 'order_by'.
        """
        latest_message_subquery = ChatMessage.objects.filter(
            chat=OuterRef("pk"),
        ).order_by("-date")

        return self.annotate(
            last_message=Subquery(latest_message_subquery.values("content")[:1]),
            last_message_date=Subquery(latest_message_subquery.values("date")[:1]),
            last_message_id=Subquery(latest_message_subquery.values("pk")[:1]),
        ).order_by("-last_message_date")

    def with_other_user_profile_info(self, profile: Profile):
        other_chat_participant_subquery = Profile.objects.filter(
            chats=OuterRef("pk")
        ).exclude(pk=profile.pk,)[:1]
        blocked_through = Profile.blocked_users.through

        return self.annotate(
            username=Subquery(other_chat_participant_subquery.values("user__username")),
            nickname=Subquery(other_chat_participant_subquery.values("user__nickname")),
            avatar=Coalesce(
                # sets field to null if the profile_picture is an empty string
                NullIf(
                    Subquery(other_chat_participant_subquery.values("profile_picture")),
                    Value("", output_field=ImageField()),
                ),
                Value(settings.DEFAULT_USER_AVATAR, output_field=ImageField()),
            ),
            # << << << < HEAD
            # last_activity=Subquery(
            #     other_chat_participant_subquery.values("last_activity")),
            # is_online=Subquery(
            #     other_chat_participant_subquery.values("is_online")),
            # other_profile_id=Subquery(
            #     other_chat_participant_subquery.values("pk")),
            # unread_messages_count=Count("messages", filter=~Q(
            #     messages__sender=profile) & Q(messages__is_read=False)),
            # real_online=ExpressionWrapper(
            #     Q(last_activity__gte=Now() - timedelta(minutes=2)), output_field=BooleanField()
            # ),
            # == == == =
            is_online=Subquery(other_chat_participant_subquery.values("is_online")),
            other_profile_id=Subquery(other_chat_participant_subquery.values("pk")),
            unread_messages_count=Count(
                "messages",
                filter=~Q(messages__sender=profile) & Q(messages__is_read=False),
            ),
        ).annotate(
            is_blocked_user=Exists(
                blocked_through.objects.filter(
                    from_profile=profile,
                    to_profile=OuterRef("other_profile_id"),
                ),
            ),
            is_blocked_by_user=Exists(
                blocked_through.objects.filter(
                    from_profile=OuterRef("other_profile_id"),
                    to_profile=profile,
                ),
            ),
        )

    def get_user_chats(self, profile: Profile):
        return (
            Chat.objects.for_participants(profile)
            .with_and_order_by_last_message()
            .with_other_user_profile_info(profile)
            # .annotate_real_online()
        )


class Chat(models.Model):
    """
    Represents the chat between unspecified amount of users.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(Profile, related_name="chats")

    objects = ChatQuerySet.as_manager()

    def __str__(self):
        if self.participants.count() == 0:
            return "Empty chat"

        max_participants_to_display = 20
        participants_list = [
            p.user.username
            for p in self.participants.all()[:max_participants_to_display]
        ]
        res = ", ".join(participants_list)
        if self.participants.count() > max_participants_to_display:
            res + " ..."
        return res


class ChatMessageQuerySet(models.QuerySet):
    def create(self, content: str, sender: Profile, chat: Chat):
        new_message = self.model(content=content, sender=sender, chat=chat)
        new_message.save()
        return new_message


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField(max_length=256)
    date = models.DateTimeField(auto_now_add=True)
    sender = models.ForeignKey(
        Profile, related_name="sent_messages", on_delete=models.CASCADE
    )
    chat = models.ForeignKey(Chat, related_name="messages", on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    is_liked = models.BooleanField(default=False)

    objects = ChatMessageQuerySet.as_manager()

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        max_msg_len = 15
        return (
            f"{self.date} {self.sender.user.username}: "
            f"{self.content[:max_msg_len] + ' ...' if len(self.content) > max_msg_len else self.content}"
        )


class NotificationManager(models.Manager):
    def _create(
        self,
        receiver: Profile,
        sender: Profile,
        notification_action: str,
        notification_data={},  # noqa: B006
        date: datetime = None,
    ):
        """
        `notification_data` is a data specific to the notification of the `notification_action`.

        Notification.NEW_FRIEND:     no additional data required
        Notification.GAME_INVITE:    `game_id`
        Notification.NEW_TOURNAMENT: `tournament_id`, `tournament_name`
        """
        data = sender.to_username_nickname_avatar_schema() | notification_data
        data["date"] = date or datetime.now(timezone.utc)

        match notification_action:
            case self.model.GAME_INVITE:
                if not notification_data.get("game_id"):
                    raise ValueError(
                        "notification_action is Notification.GAME_INVITE, but no game_id in "
                        "notification_data"
                    )
            case self.model.NEW_TOURNAMENT:
                if not notification_data.get(
                    "tournament_id"
                ) or not notification_data.get("tournament_name"):
                    raise ValueError(
                        "notification_action is Notification.NEW_TOURNAMENT, but no tournament_id or "
                        "tournament_name in notification_data"
                    )

        return self.create(receiver=receiver, data=data, action=notification_action)

    def action_new_friend(
        self, receiver: Profile, sender: Profile, date: datetime = None
    ):
        """
        May include additional operations like using the channel layer to send data with websocket.
        """
        return self._create(
            receiver=receiver,
            sender=sender,
            notification_action=self.model.NEW_FRIEND,
            date=date,
        )


class Notification(models.Model):
    GAME_INVITE = "game_invite"
    REPLY_GAME_INVITE = "reply_game_invite"
    NEW_TOURNAMENT = "new_tournament"
    NEW_FRIEND = "new_friend"
    MESSAGE = "message"

    ACTION_CHOICES = (
        (GAME_INVITE, "Game invite"),
        (REPLY_GAME_INVITE, "Reply to game invite"),
        (NEW_TOURNAMENT, "New tournament"),
        (NEW_FRIEND, "New friend"),
        (MESSAGE, "Message received"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receiver = models.ForeignKey(
        Profile, related_name="notifications", on_delete=models.CASCADE
    )
    data = models.JSONField(encoder=DjangoJSONEncoder, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    is_read = models.BooleanField(default=False)

    objects = NotificationManager()

    class Meta:
        ordering = ["-data__date"]

    def __str__(self):
        return f"Notification {self.action} for {self.receiver.user.username}"


class GameSession(models.Model):  # noqa: DJ008
    """
    Currently a no-op, but can be extended
    """


class GameInvitation(models.Model):
    INVITE_STATUS = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, null=True, blank=True)
    game_session = models.ForeignKey(
        GameSession, on_delete=models.PROTECT, related_name="game_invites"
    )
    recipient = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="received_invites"
    )
    status = models.CharField(
        max_length=11, blank=False, choices=INVITE_STATUS, default="pending"
    )

    def __str__(self):
        return f"{self.game_session}:"
