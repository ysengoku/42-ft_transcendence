from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    avatar = models.ImageField(
        upload_to='avatars/',
        default='avatars/default_avatar.png',
        null=True,
        blank=True
    )
    
    def __str__(self):
        return self.username