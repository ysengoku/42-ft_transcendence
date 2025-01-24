from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Profile, User


@receiver(post_save, sender=User)
def create_profile(sender, instance: User, created: bool, **kwargs) -> None:
    if created:
        Profile.objects.create(
            user=instance,
        )


@receiver(post_delete, sender=Profile)
def delete_avatar(sender, instance: Profile, **kwargs) -> None:
    instance.delete_avatar()
