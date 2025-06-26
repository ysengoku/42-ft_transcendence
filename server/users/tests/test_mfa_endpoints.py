import logging
from unittest.mock import patch
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from users.models import User


class MfaEndpointsTests(TestCase):
    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.user = User.objects.create_user(
            "TestUser", email="test@example.com", password="TestPassword123", mfa_enabled=True
        )

    def tearDown(self):
        logging.disable(logging.NOTSET)

    @patch("users.router.endpoints.mfa.send_mail")
    def test_resend_code_with_valid_user(self, mock_send_mail):
        mock_send_mail.return_value = True
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "TestUser"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Verification code sent to user email", status_code=200)
        mock_send_mail.assert_called_once()

    def test_resend_code_with_invalid_user(self):
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "NonExistentUser"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "User with that email not found", status_code=404)

    @patch("users.router.endpoints.mfa.send_mail")
    def test_resend_code_with_mail_failure(self, mock_send_mail):
        mock_send_mail.return_value = False
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "TestUser"},
        )
        self.assertIsNone(response)

    def test_verify_mfa_with_invalid_user(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "NonExistentUser", "token": "123456"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, "User not found", status_code=404)

    def test_verify_mfa_with_invalid_token_format_short(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Invalid code format. Please enter a 6-digit code.", status_code=400)

    def test_verify_mfa_with_invalid_token_format_long(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "1234567"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Invalid code format. Please enter a 6-digit code.", status_code=400)

    def test_verify_mfa_with_non_numeric_token(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "abc123"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Invalid code format. Please enter a 6-digit code.", status_code=400)

    def test_verify_mfa_with_empty_token(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": ""},
        )
        self.assertEqual(response.status_code, 400)
        self.assertContains(response, "Invalid code format. Please enter a 6-digit code.", status_code=400)

    def test_verify_mfa_with_expired_token(self):
        # Set expired MFA token
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now() - timedelta(minutes=15)
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        self.assertEqual(response.status_code, 408)
        self.assertContains(response, "Expired session: authentication request timed out", status_code=408)

    def test_verify_mfa_with_incorrect_token(self):
        # Set valid MFA token
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now()
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "654321"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertContains(response, "Invalid verification code", status_code=401)

    def test_verify_mfa_with_correct_token(self):
        # Set valid MFA token
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now()
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["username"], "TestUser")
        self.assertEqual(response_data["nickname"], "TestUser")
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_verify_mfa_without_mfa_token_set(self):
        # User without MFA token set
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertContains(response, "Invalid verification code", status_code=401)
