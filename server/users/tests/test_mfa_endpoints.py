import logging
from unittest.mock import patch
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from users.models import User


class MfaEndpointsTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        logging.disable(logging.CRITICAL)
    
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        logging.disable(logging.NOTSET)

    def setUp(self):
        self.user = User.objects.create_user(
            "TestUser", email="test@example.com", password="TestPassword123", mfa_enabled=True
        )

    @patch("users.router.endpoints.mfa.send_mail")
    def test_resend_code_with_valid_user(self, mock_send_mail):
        mock_send_mail.return_value = True
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "TestUser"},
        )
        # API returns 200 for successful code sending
        self.assertEqual(response.status_code, 200)

    def test_resend_code_with_invalid_user(self):
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "NonExistentUser"},
        )
        # API returns 404 for user not found
        self.assertEqual(response.status_code, 404)

    @patch("users.router.endpoints.mfa.send_mail")
    def test_resend_code_with_mail_failure(self, mock_send_mail):
        mock_send_mail.return_value = False
        response = self.client.post(
            "/api/mfa/resend-code",
            content_type="application/json",
            data={"username": "TestUser"},
        )
        # API returns 500 for server error when mail fails
        self.assertEqual(response.status_code, 500)

    def test_verify_mfa_with_invalid_user(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "NonExistentUser", "token": "123456"},
        )
        # API returns 404 for user not found
        self.assertEqual(response.status_code, 404)

    def test_verify_mfa_token_format_validation(self):
        # Group all token format validation tests
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now()
        self.user.save()
        
        invalid_tokens = [
            ("123", "too short"),
            ("1234567", "too long"),
            ("abc123", "non-numeric"),
            ("", "empty")
        ]
        
        for token, description in invalid_tokens:
            with self.subTest(token=token, description=description):
                response = self.client.post(
                    "/api/mfa/verify-mfa",
                    content_type="application/json",
                    data={"username": "TestUser", "token": token},
                )
                self.assertEqual(response.status_code, 400)

    def test_verify_mfa_with_expired_token(self):
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now() - timedelta(minutes=15)
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        # API returns 408 for expired token
        self.assertEqual(response.status_code, 408)

    def test_verify_mfa_with_incorrect_token(self):
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now()
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "654321"},
        )
        # API returns 401 for incorrect token
        self.assertEqual(response.status_code, 401)

    def test_verify_mfa_with_correct_token(self):
        self.user.mfa_token = "123456"
        self.user.mfa_token_date = timezone.now()
        self.user.save()
        
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        # API returns 200 for successful verification
        self.assertEqual(response.status_code, 200)

    def test_verify_mfa_without_mfa_token_set(self):
        response = self.client.post(
            "/api/mfa/verify-mfa",
            content_type="application/json",
            data={"username": "TestUser", "token": "123456"},
        )
        # API returns 400 for no verification code sent
        self.assertEqual(response.status_code, 400)
