from django.db import models
from django.contrib.auth.models import AbstractUser


# Create your models here.
class User(AbstractUser):
    account_balance = models.DecimalField(max_digits=5, decimal_places=2, default=0)
