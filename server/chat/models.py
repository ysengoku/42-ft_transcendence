import uuid

from django.db import models

from users.models import Profile


class Dialogue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user1 = models.ForeignKey(Profile, related_name="dialogues_as_user1", on_delete=models.CASCADE)
    user2 = models.ForeignKey(Profile, related_name="dialogues_as_user2", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("user1", "user2")

    def __str__(self):
        return ""


class PrivateMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.CharField(max_length=256)
    date = models.DateTimeField(auto_now_add=True)
    sender = models.ForeignKey(Profile, related_name="sent_messages", on_delete=models.CASCADE)
    receiver = models.ForeignKey(Profile, related_name="received_messages", on_delete=models.CASCADE)
    dialogue = models.ForeignKey(Dialogue, related_name="messages", on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    is_liked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        max_msg_len = 15
        return (
            f"{self.date} {self.sender.user.username} to {self.receiver.user.username}: "
            f"{self.content[:max_msg_len] + ' ...' if len(self.content) > max_msg_len else self.content}"
        )
