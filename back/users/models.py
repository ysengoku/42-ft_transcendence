from django.contrib.auth.models import AbstractUser
from django.db import models

def user_avatar_path(instance, filename):
    # Chemin de sauvegarde : media/avatars/user_<id>/<filename>
    return f'avatars/user_{instance.id}/{filename}'

class User(AbstractUser):
    avatar = models.ImageField(
        upload_to=user_avatar_path,
        default='avatars/default_avatar.png',
        blank=True,
        null=True
    )

    def __str__(self):
        return self.username
