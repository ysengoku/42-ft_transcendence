import logging
from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from django.utils import timezone

from users.models import RefreshToken, User


class AuthEndpointsTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        logging.disable(logging.CRITICAL)
    
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        logging.disable(logging.NOTSET)

    def setUp(self):
        self.user = User.objects.create_user("TestUser", email="test@example.com", password="TestPassword123")
        self.user_with_mfa = User.objects.create_user(
            "MfaUser", email="mfa@example.com", password="TestPassword123", mfa_enabled=True
        )

    def test_login_with_bad_data(self):
        response = self.client.post("/api/login", content_type="application/json", data={"dummy": "dummy"})
        self.assertEqual(response.status_code, 422)

    def test_login_with_empty_data(self):
        response = self.client.post("/api/login", content_type="application/json")
        self.assertEqual(response.status_code, 422)

    def test_login_with_incorrect_credentials(self):
        # Test both wrong username and wrong password in one test
        test_cases = [
            {"username": "wronguser", "password": "wrongpass"},
            {"username": "TestUser", "password": "wrongpass"}
        ]
        for credentials in test_cases:
            with self.subTest(credentials=credentials):
                response = self.client.post(
                    "/api/login",
                    content_type="application/json",
                    data=credentials,
                )
                self.assertEqual(response.status_code, 401)
                self.assertContains(response, "Username or password are not correct.", status_code=401)

    def test_login_with_correct_credentials(self):
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["username"], "TestUser")
        self.assertEqual(response_data["nickname"], "TestUser")
        self.assertEqual(response_data["avatar"], "/img/default_avatar.png")
        self.assertEqual(response_data["elo"], 1000)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_login_with_email(self):
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "test@example.com", "password": "TestPassword123"},
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["username"], "TestUser")

    @patch("users.router.endpoints.mfa.send_mail")
    def test_login_with_mfa_enabled(self, mock_send_mail):
        mock_send_mail.return_value = True
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "MfaUser", "password": "TestPassword123"},
        )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data["mfa_required"])
        self.assertEqual(response_data["username"], "MfaUser")
        mock_send_mail.assert_called_once()

    @patch("users.router.endpoints.mfa.send_mail")
    def test_login_with_mfa_send_mail_failure(self, mock_send_mail):
        mock_send_mail.return_value = False
        response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "MfaUser", "password": "TestPassword123"},
        )
        self.assertEqual(response.status_code, 503)

    def test_signup_with_valid_data(self):
        response = self.client.post(
            "/api/signup",
            content_type="application/json",
            data={
                "username": "NewUser",
                "email": "newuser@example.com",
                "password": "NewPassword123",
                "password_repeat": "NewPassword123",
            },
        )
        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertEqual(response_data["username"], "NewUser")
        self.assertEqual(response_data["nickname"], "NewUser")
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)
        self.assertTrue(User.objects.filter(username="NewUser").exists())

    def test_signup_validation_errors(self):
        # Group all signup validation tests in one to reduce overhead
        test_cases = [
            {
                "data": {"username": "TestUser", "email": "different@example.com", "password": "NewPassword123", "password_repeat": "NewPassword123"},
                "description": "existing username"
            },
            {
                "data": {"username": "DifferentUser", "email": "test@example.com", "password": "NewPassword123", "password_repeat": "NewPassword123"},
                "description": "existing email"
            },
            {
                "data": {"username": "NewUser", "email": "newuser@example.com", "password": "NewPassword123", "password_repeat": "DifferentPassword123"},
                "description": "password mismatch"
            },
            {
                "data": {"username": "NewUser", "email": "newuser@example.com", "password": "123", "password_repeat": "123"},
                "description": "weak password"
            }
        ]
        
        for case in test_cases:
            with self.subTest(test_case=case["description"]):
                response = self.client.post(
                    "/api/signup",
                    content_type="application/json",
                    data=case["data"],
                )
                self.assertEqual(response.status_code, 422)

    def test_self_while_logged_out(self):
        response = self.client.get("/api/self")
        self.assertEqual(response.status_code, 401)

    def test_self_while_logged_in(self):
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        response = self.client.get("/api/self")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data["username"], "TestUser")
        self.assertEqual(response_data["nickname"], "TestUser")
        self.assertIsNone(response_data["game_id"])
        self.assertIsNone(response_data["tournament_id"])
        self.assertFalse(response_data["is_engaged_in_game"])

    def test_refresh_token_without_cookie(self):
        response = self.client.post("/api/refresh")
        self.assertEqual(response.status_code, 401)

    def test_refresh_token_with_invalid_cookie(self):
        self.client.cookies["refresh_token"] = "invalid_token"
        response = self.client.post("/api/refresh")
        self.assertEqual(response.status_code, 401)

    def test_refresh_token_with_valid_cookie(self):
        login_response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        refresh_token = login_response.cookies["refresh_token"].value
        
        self.client.cookies["refresh_token"] = refresh_token
        response = self.client.post("/api/refresh")
        self.assertEqual(response.status_code, 204)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_logout_without_token(self):
        response = self.client.delete("/api/logout")
        self.assertEqual(response.status_code, 401)

    def test_logout_with_valid_token(self):
        login_response = self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        refresh_token = login_response.cookies["refresh_token"].value
        
        self.client.cookies["refresh_token"] = refresh_token
        response = self.client.delete("/api/logout")
        self.assertEqual(response.status_code, 204)
        
        # Check that token is revoked
        token_obj = RefreshToken.objects.filter(token=refresh_token).first()
        self.assertTrue(token_obj.is_revoked)

    def test_delete_account_while_logged_out(self):
        response = self.client.delete("/api/users/TestUser/delete")
        self.assertEqual(response.status_code, 401)

    def test_delete_account_different_user(self):
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        response = self.client.delete("/api/users/DifferentUser/delete")
        self.assertEqual(response.status_code, 403)

    def test_delete_account_success(self):
        self.client.post(
            "/api/login",
            content_type="application/json",
            data={"username": "TestUser", "password": "TestPassword123"},
        )
        response = self.client.delete("/api/users/TestUser/delete")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Account successfully deleted.", status_code=200)
        self.assertFalse(User.objects.filter(username="TestUser").exists())

    @patch("users.router.endpoints.auth.send_mail")
    def test_forgot_password_with_valid_email(self, mock_send_mail):
        mock_send_mail.return_value = True
        response = self.client.post(
            "/api/forgot-password",
            content_type="application/json",
            data={"email": "test@example.com"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Password reset instructions sent to your email", status_code=200)
        mock_send_mail.assert_called_once()
        
        # Check that token was set
        user = User.objects.get(username="TestUser")
        self.assertIsNotNone(user.forgot_password_token)
        self.assertIsNotNone(user.forgot_password_token_date)

    def test_forgot_password_with_invalid_email(self):
        response = self.client.post(
            "/api/forgot-password",
            content_type="application/json",
            data={"email": "nonexistent@example.com"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Password reset instructions sent to your email if email exists.", status_code=200)

    def test_reset_password_with_invalid_token(self):
        response = self.client.post(
            "/api/reset-password/invalid_token",
            content_type="application/json",
            data={"password": "NewPassword123", "password_repeat": "NewPassword123"},
        )
        self.assertEqual(response.status_code, 401)

    def test_reset_password_with_expired_token(self):
        # Set expired token
        self.user.forgot_password_token = "valid_token"
        self.user.forgot_password_token_date = timezone.now() - timezone.timedelta(minutes=15)
        self.user.save()
        
        response = self.client.post(
            "/api/reset-password/valid_token",
            content_type="application/json",
            data={"password": "NewPassword123", "password_repeat": "NewPassword123"},
        )
        self.assertEqual(response.status_code, 408)

    def test_reset_password_with_valid_token(self):
        # Set valid token
        self.user.forgot_password_token = "valid_token"
        self.user.forgot_password_token_date = timezone.now()
        self.user.save()
        
        response = self.client.post(
            "/api/reset-password/valid_token",
            content_type="application/json",
            data={"password": "NewPassword123", "password_repeat": "NewPassword123"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Password has been reset successfully", status_code=200)
        
        # Check that password was changed
        user = User.objects.get(username="TestUser")
        self.assertTrue(user.check_password("NewPassword123"))
        self.assertEqual(user.forgot_password_token, "")
        self.assertIsNone(user.forgot_password_token_date)

    def test_reset_password_validation_errors(self):
        # Group password reset validation tests
        test_cases = [
            {
                "data": {"password": "NewPassword123", "password_repeat": "DifferentPassword123"},
                "description": "mismatched passwords"
            },
            {
                "data": {"password": "123", "password_repeat": "123"},
                "description": "weak password"
            }
        ]
        
        for case in test_cases:
            with self.subTest(test_case=case["description"]):
                # Set valid token for each test
                self.user.forgot_password_token = "valid_token"
                self.user.forgot_password_token_date = timezone.now()
                self.user.save()
                
                response = self.client.post(
                    "/api/reset-password/valid_token",
                    content_type="application/json",
                    data=case["data"],
                )
                self.assertEqual(response.status_code, 422)
