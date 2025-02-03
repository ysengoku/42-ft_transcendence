from django.db import models
from django.contrib.auth.models import User


class TwoFactorAuth(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    secret = models.CharField(max_length=32) # secret key for the user
    is_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_2fa"

    def __str__(self):
        return f"2FA for {self.user.slug_id}"