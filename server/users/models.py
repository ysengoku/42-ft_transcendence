from django.db import models
from django.contrib.auth.models import AbstractUser
from django.templatetags.static import static


class User(AbstractUser):
    pass


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(
        upload_to="avatars/", null=True, blank=True
    )
    elo = models.PositiveIntegerField(default=1000)
    friends = models.ManyToManyField(User, related_name='friends', blank=True)
    is_online = models.BooleanField(default=True)

    @property
    def avatar(self):
        if self.profile_picture:
            return self.profile_picture.url
        return static("images/default.svg")

    def __str__(self):
        return self.user.username
