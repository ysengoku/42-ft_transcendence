# users/tests/test_oauth2_endpoints.py
import logging
from datetime import timedelta
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

import requests
from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from users.models import OauthConnection, User


# ---------- Base helpers / setup ----------

class BaseOAuthTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        logging.disable(logging.CRITICAL)

    @classmethod
    def tearDownClass(cls):
        logging.disable(logging.NOTSET)
        super().tearDownClass()

    def setUp(self):
        # Mocks communs
        self.mock_api_success = MagicMock(status_code=200)

        self.mock_token_success = MagicMock(status_code=200)
        self.mock_token_success.json.return_value = {"access_token": "test_token"}

        self.mock_github_user = {
            "id": 12345,
            "login": "testuser",
            "email": "test@example.com",
            "avatar_url": "https://example.com/avatar.png",
        }

        self.mock_42_user = {
            "id": 54321,
            "login": "testuser42",
            "email": "test42@example.com",
            "image": {"versions": {"medium": "https://example.com/avatar.png"}},
        }

    # Helper: parse auth_url et renvoyer state
    def _extract_state_from_auth_url(self, auth_url: str) -> str:
        qs = parse_qs(urlparse(auth_url).query)
        return qs["state"][0]


# ---------- /authorize tests (health-check & URL) ----------

class OAuthAuthorizeTests(BaseOAuthTests):
    def test_oauth_authorize_unsupported_platform(self):
        resp = self.client.get("/api/oauth/authorize/unsupported")
        self.assertEqual(resp.status_code, 404)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_github_success(self, mock_head):
        mock_head.return_value.status_code = 200

        resp = self.client.get("/api/oauth/authorize/github")
        self.assertEqual(resp.status_code, 200)

        data = resp.json()
        self.assertIn("auth_url", data)

        # Vérifie paramètres + enregistrement PENDING précis
        state = self._extract_state_from_auth_url(data["auth_url"])
        parsed = parse_qs(urlparse(data["auth_url"]).query)
        self.assertEqual(parsed["response_type"][0], "code")
        self.assertIn("client_id", parsed)
        self.assertIn("state", parsed)

        conn = OauthConnection.objects.get(state=state)
        self.assertEqual(conn.status, OauthConnection.PENDING)
        self.assertEqual(conn.platform, "github")

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_success(self, mock_head):
        mock_head.return_value.status_code = 200

        resp = self.client.get("/api/oauth/authorize/42")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("auth_url", data)

        state = self._extract_state_from_auth_url(data["auth_url"])
        conn = OauthConnection.objects.get(state=state)
        self.assertEqual(conn.status, OauthConnection.PENDING)
        self.assertEqual(conn.platform, "42")

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_authorize_github_health_fail_head_500_redirects_503(self, mock_head):
        mock_head.return_value.status_code = 500
        resp = self.client.get("/api/oauth/authorize/github", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(settings.ERROR_REDIRECT_URL, resp["Location"])
        self.assertIn("code=503", resp["Location"])

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_authorize_42_health_fail_head_500_redirects_503(self, mock_head):
        mock_head.return_value.status_code = 500
        resp = self.client.get("/api/oauth/authorize/42", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(settings.ERROR_REDIRECT_URL, resp["Location"])
        self.assertIn("code=503", resp["Location"])

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.head")
    def test_authorize_github_head_405_then_get_500_redirects_503(self, mock_head, mock_get):
        mock_head.return_value.status_code = 405
        mock_get.return_value.status_code = 500
        resp = self.client.get("/api/oauth/authorize/github", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn("code=503", resp["Location"])

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.head")
    def test_authorize_github_head_405_then_get_200_returns_auth_url(self, mock_head, mock_get):
        mock_head.return_value.status_code = 405
        mock_get.return_value.status_code = 200
        resp = self.client.get("/api/oauth/authorize/github")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("auth_url", resp.json())

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_authorize_42_head_301_redirect_tolerated_returns_auth_url(self, mock_head):
        mock_head.return_value.status_code = 301
        resp = self.client.get("/api/oauth/authorize/42")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("auth_url", resp.json())

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_connection_error(self, mock_head):
        mock_head.side_effect = requests.RequestException("Connection error")
        resp = self.client.get("/api/oauth/authorize/42", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(settings.ERROR_REDIRECT_URL, resp["Location"])
        self.assertIn("code=503", resp["Location"])


# ---------- /callback validation tests (params & state) ----------

class OAuthCallbackValidationTests(BaseOAuthTests):
    def test_oauth_callback_unsupported_platform(self):
        resp = self.client.get("/api/oauth/callback/unsupported?code=test&state=test")
        self.assertEqual(resp.status_code, 404)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_with_oauth_error(self, mock_head):
        mock_head.return_value.status_code = 200
        resp = self.client.get(
            "/api/oauth/callback/github?error=access_denied&error_description=User%20denied%20access"
        )
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=access_denied%3A%20User%20denied%20access", resp.url)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_with_different_error_types(self, mock_head):
        mock_head.return_value.status_code = 200
        cases = [
            ("invalid_request", "Request was invalid"),
            ("unauthorized_client", "Client not authorized"),
            ("access_denied", "User denied access"),
            ("unsupported_response_type", "Response type not supported"),
            ("invalid_scope", "Scope is invalid"),
            ("server_error", "Server encountered an error"),
            ("temporarily_unavailable", "Service temporarily unavailable"),
        ]
        for error_type, desc in cases:
            with self.subTest(error=error_type):
                resp = self.client.get(
                    f"/api/oauth/callback/github?error={error_type}&error_description={desc.replace(' ', '%20')}"
                )
                self.assertEqual(resp.status_code, 302)
                self.assertIn(f"error={error_type}", resp.url)
                self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_missing_parameters(self, mock_head):
        mock_head.return_value.status_code = 200
        cases = [
            ("/api/oauth/callback/github?state=test", "missing code"),
            ("/api/oauth/callback/github?code=test", "missing state"),
            ("/api/oauth/callback/github", "missing both"),
            ("/api/oauth/callback/github?code=&state=test", "empty code"),
            ("/api/oauth/callback/github?code=test&state=", "empty state"),
        ]
        for url, desc in cases:
            with self.subTest(case=desc):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=Missing%20code%20or%20state", resp.url)
                self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_invalid_state(self, mock_head):
        mock_head.return_value.status_code = 200
        resp = self.client.get("/api/oauth/callback/github?code=test&state=invalid_state_not_in_db")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=Invalid%20state", resp.url)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_state_platform_mismatch(self, mock_head):
        mock_head.return_value.status_code = 200
        OauthConnection.objects.create_pending_connection("github_state", "github")
        resp = self.client.get("/api/oauth/callback/42?code=test&state=github_state")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_expired_state(self, mock_head):
        mock_head.return_value.status_code = 200
        oauth_conn = OauthConnection.objects.create_pending_connection("test_state", "github")
        oauth_conn.date = timezone.now() - timedelta(minutes=5)
        oauth_conn.save(update_fields=["date"])  # important

        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("code=422", resp.url)


# ---------- /callback flow tests (token/user info/success, race, reuse) ----------

class OAuthCallbackFlowTests(BaseOAuthTests):
    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_network_timeout_simulation(self, mock_head):
        mock_head.return_value.status_code = 200
        with patch("users.router.endpoints.oauth2.requests.post") as mock_post, \
             patch("users.router.endpoints.oauth2.requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_post.side_effect = requests.Timeout("Request timed out")
            OauthConnection.objects.create_pending_connection("timeout_state", "github")

            resp = self.client.get("/api/oauth/callback/github?code=test&state=timeout_state")
            self.assertEqual(resp.status_code, 302)
            self.assertIn("error=", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_token_request_various_failures(self, mock_post, mock_get, mock_head):
        mock_head.return_value.status_code = 200
        mock_get.return_value.status_code = 200  # API reachable

        cases = [
            (400, {"error": "invalid_request", "error_description": "Invalid request"}),
            (401, {"error": "invalid_client", "error_description": "Client authentication failed"}),
            (400, {"error": "invalid_grant", "error_description": "Invalid authorization grant"}),
            (400, {"error": "unauthorized_client", "error_description": "Client not authorized"}),
            (400, {"error": "unsupported_grant_type", "error_description": "Grant type not supported"}),
            (500, {"error": "server_error", "error_description": "Internal server error"}),
        ]
        for status_code, error_response in cases:
            with self.subTest(error=error_response["error"]):
                mock_post.reset_mock()
                mock_post.return_value.status_code = status_code
                mock_post.return_value.json.return_value = error_response

                state = f"test_state_{error_response['error']}"
                OauthConnection.objects.create_pending_connection(state, "github")

                resp = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_user_info_various_failures(self, mock_post, mock_get, mock_head):
        mock_head.return_value.status_code = 200
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "test_token"}

        cases = [401, 403, 404, 429, 500, 502, 503]
        for status_code in cases:
            with self.subTest(status=status_code):
                mock_user_info = MagicMock(status_code=status_code)
                mock_get.side_effect = [mock_user_info]  # call to user info
                state = f"test_state_{status_code}"
                OauthConnection.objects.create_pending_connection(state, "github")

                resp = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_github_success_new_user(self, mock_post, mock_get, mock_head):
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success

        mock_user_info = MagicMock(status_code=200)
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.side_effect = [mock_user_info]

        OauthConnection.objects.create_pending_connection("test_state", "github")
        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state", follow=False)
        self.assertEqual(resp.status_code, 302)
        # redirigé vers HOME avec cookies (le détail de l'URL n'est pas asser­té ici)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_42_success_new_user(self, mock_post, mock_get, mock_head):
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success

        mock_user_info = MagicMock(status_code=200)
        mock_user_info.json.return_value = self.mock_42_user
        mock_get.side_effect = [mock_user_info]

        OauthConnection.objects.create_pending_connection("test_state", "42")
        resp = self.client.get("/api/oauth/callback/42?code=test&state=test_state", follow=False)
        self.assertEqual(resp.status_code, 302)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_existing_user(self, mock_post, mock_get, mock_head):
        mock_head.return_value.status_code = 200
        existing_user = User.objects.create_user("testuser", email="test@example.com", password="test123")

        mock_post.return_value = self.mock_token_success
        mock_user_info = MagicMock(status_code=200)
        # Renvoie le même login/email que l'user existant pour simuler le match
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.side_effect = [mock_user_info]

        OauthConnection.objects.create_pending_connection("test_state", "github")
        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state", follow=False)
        self.assertEqual(resp.status_code, 302)

    @patch("users.models.oauth_connection.requests.get")                 # avatar download
    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")                 # user info
    @patch("users.router.endpoints.oauth2.requests.post")                # token
    def test_oauth_callback_concurrent_requests_same_state(self, mock_post, mock_get, mock_head, mock_avatar_get):
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success

        mock_user_info = MagicMock(status_code=200)
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.return_value = mock_user_info

        mock_avatar_response = MagicMock(status_code=200, content=b"fake_avatar_data")
        mock_avatar_get.return_value = mock_avatar_response

        state = "concurrent_test_state"
        OauthConnection.objects.create_pending_connection(state, "github")

        # 1er call : succès
        r1 = self.client.get(f"/api/oauth/callback/github?code=test1&state={state}", follow=False)
        self.assertEqual(r1.status_code, 302)

        # 2e call même state : doit échouer (state déjà consommé)
        r2 = self.client.get(f"/api/oauth/callback/github?code=test2&state={state}", follow=False)
        self.assertEqual(r2.status_code, 302)
        self.assertIn("code=422", r2["Location"])

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_state_reuse_prevention(self, mock_post, mock_get, mock_head):
        """OAuth state cannot be reused after successful authentication"""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success

        mock_user_info = MagicMock(status_code=200)
        mock_user_info.json.return_value = self.mock_github_user
        # 1er call: user info OK ; 2e call: peu importe, ça échoue déjà sur l'état
        mock_get.side_effect = [mock_user_info]

        state = "reuse_test_state"
        oauth_conn = OauthConnection.objects.create_pending_connection(state, "github")

        # 1er call → succès, état doit passer à USED
        r1 = self.client.get(f"/api/oauth/callback/github?code=test&state={state}", follow=False)
        self.assertEqual(r1.status_code, 302)

        oauth_conn.refresh_from_db()
        self.assertEqual(oauth_conn.status, OauthConnection.USED)

        # 2e call même state → doit échouer (422)
        r2 = self.client.get(f"/api/oauth/callback/github?code=test2&state={state}", follow=False)
        self.assertEqual(r2.status_code, 302)
        self.assertIn("code=422", r2["Location"])
