from .models import User, Profile
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import os


@receiver(post_save, sender=User)
def create_profile(sender, instance: User, created: bool, **kwargs):
    if created:
        Profile.objects.create(
            user=instance,
        )


@receiver(post_delete, sender=Profile)
def delete_avatar(sender, instance: Profile, **kwargs):
    instance.delete_avatar()
