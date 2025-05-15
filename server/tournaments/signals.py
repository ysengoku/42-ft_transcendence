from django.db.models import Max
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Round


@receiver(pre_save, sender=Round)
def set_round_number(sender, instance, **kwargs):
    if not instance.number:
        last_round = Round.objects.filter(tournament=instance.tournament).aggregate(
            Max("number")
        )["number__max"]
        instance.number = (last_round or 0) + 1
