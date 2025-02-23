import uuid

from django.db import models
from django.db.models import Count, Exists, OuterRef, Q, Subquery

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
        latest_message_subquery = ChatMessage.objects.all()[:1]

        return self.annotate(
            last_message=Subquery(latest_message_subquery.values("content")),
            last_message_date=Subquery(latest_message_subquery.values("date")),
            last_message_id=Subquery(latest_message_subquery.values("pk")),
        ).order_by("-last_message_date")

    def with_other_user_profile_info(self, profile: Profile):
        other_chat_participant_subquery = Profile.objects.filter(chats=OuterRef("pk")).exclude(
            pk=profile.pk,
        )[:1]
        blocked_through = Profile.blocked_users.through

        return self.annotate(
            username=Subquery(other_chat_participant_subquery.values("user__username")),
            nickname=Subquery(other_chat_participant_subquery.values("user__nickname")),
            avatar=Subquery(other_chat_participant_subquery.values("profile_picture")),
            is_online=Subquery(other_chat_participant_subquery.values("is_online")),
            other_profile_id=Subquery(other_chat_participant_subquery.values("pk")),
            unread_messages_count=Count("messages", filter=~Q(messages__sender=profile) & Q(messages__is_read=False)),
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
        )


class Chat(models.Model):
    """
    Represents the chat between unspecified amount of users.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(Profile, related_name="chats")

    objects = ChatQuerySet.as_manager()

    def __str__(self):
        max_participants_to_display = 20
        participants_list = [p.user.username for p in self.participants.all()[:max_participants_to_display]]
        res = ", ".join(participants_list)
        if self.participants.count() > max_participants_to_display:
            res + " ..."
        return res


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.CharField(max_length=256)
    date = models.DateTimeField(auto_now_add=True)
    sender = models.ForeignKey(Profile, related_name="sent_messages", on_delete=models.CASCADE)
    chat = models.ForeignKey(Chat, related_name="messages", on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    is_liked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        if self.participants.count() == 0:
            return "Empty chat"

        max_msg_len = 15
        return (
            f"{self.date} {self.sender.user.username}: "
            f"{self.content[:max_msg_len] + ' ...' if len(self.content) > max_msg_len else self.content}"
        )
