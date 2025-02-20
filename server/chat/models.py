import uuid

from django.db import models
from django.db.models import Max, OuterRef, Subquery

from users.models import Profile


class ChatQuerySet(models.QuerySet):
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

    def order_by_last_message(self):
        """
        Attaches last message date and content to Chats and sorts them by the latest message date.
        Chat messages are sorted by the date by default, so there is no need to call 'order_by'.
        """
        latest_message_subquery = ChatMessage.objects.values("content")[:1]

        return self.annotate(
            last_message=Subquery(latest_message_subquery),
            last_message_date=Max("messages__date"),
        ).order_by("-last_message_date")


class Chat(models.Model):
    """
    Represents the chat between unspecified amount of users.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(Profile, related_name="chat")

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
        max_msg_len = 15
        return (
            f"{self.date} {self.sender.user.username}: "
            f"{self.content[:max_msg_len] + ' ...' if len(self.content) > max_msg_len else self.content}"
        )
