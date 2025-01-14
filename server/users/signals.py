from .models import User, Profile
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
import os


@receiver(post_save, sender=User)
def create_profile(sender, instance: User, created: bool, **kwargs):
    if created:
        Profile.objects.create(
            user=instance,
        )


@receiver(pre_delete, sender=Profile)
def delete_avatar(sender, instance: Profile, created: bool, **kwargs):
    if instance.profile_picture and os.path.isfile(instance.profile_picture.path):
        os.remove(instance.profile_picture.path)

