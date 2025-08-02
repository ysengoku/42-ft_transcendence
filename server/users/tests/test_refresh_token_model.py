import logging

from django.test import TestCase
from django.utils import timezone
from django.db.utils import IntegrityError
from unittest.mock import patch, MagicMock
from django.utils import timezone

from users.models import User, RefreshToken


class RefreshTokenModelTests(TestCase):
    def setUp(self):
        self.user: User = User.objects.create_user("TestUser", email="user0@gmail.com", password="123")

    @patch("users.models.refresh_token.jwt.encode", return_value="old_refresh_token")
    def test_create_when_duplicate_token_exists(self, mock_encode):
        old_refresh_token = RefreshToken(user=self.user, token="old_refresh_token")
        old_refresh_token.save()

        try:
            _, new_token = RefreshToken.objects.create(self.user)
        except IntegrityError:
            self.fail("New refresh token should replace the old one in the case of collision")

    def test_create_when_date_is_the_same(self):
        fixed_date = timezone.now()

        with patch("users.models.refresh_token.timezone.now") as mock_timezone_now:
            mock_timezone_now.return_value = fixed_date
            try:
                RefreshToken.objects.create(self.user)
                RefreshToken.objects.create(self.user)
                RefreshToken.objects.create(self.user)
            except IntegrityError:
                self.fail("You need to ensure that refresh tokens are unique")
