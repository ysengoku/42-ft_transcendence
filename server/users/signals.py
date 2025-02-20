from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Profile, User


@receiver(post_save, sender=User)
def create_profile(sender, instance: User, created: bool, **kwargs) -> None:
    if created:
        Profile.objects.create(user=instance)


@receiver(pre_delete, sender=User)
def delete_avatar(sender, instance: User, **kwargs) -> None:
    instance.profile.delete_avatar()
