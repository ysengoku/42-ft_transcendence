import logging
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse
from datetime import timedelta

import requests
from django.test import TestCase
from django.conf import settings

from users.models import OauthConnection, User


class OAuth2EndpointsTests(TestCase):
    @classmethod
    def setUpClass(cls):
        """Globally silences logging for faster, cleaner test runs."""
        super().setUpClass()
        logging.disable(logging.CRITICAL)

    @classmethod
    def tearDownClass(cls):
        """Re-enables logging after the test suite completes."""
        super().tearDownClass()
        logging.disable(logging.NOTSET)

    def setUp(self):
        """Initializes shared mocks and test fixtures before each test."""
        OauthConnection.objects.all().delete()

        self.mock_api_success = MagicMock()
        self.mock_api_success.status_code = 200

        self.mock_token_success = MagicMock()
        self.mock_token_success.status_code = 200
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
            "image": {"link": "https://example.com/avatar.png"},
        }

    def test_oauth_authorize_unsupported_platform(self):
        """Returns 404 when requesting authorization for an unknown platform."""
        resp = self.client.get("/api/oauth/authorize/unsupported")
        self.assertEqual(resp.status_code, 404)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_github_success(self, mock_head):
        """Returns a GitHub authorization URL and creates a pending OAuth connection."""
        mock_head.return_value.status_code = 200
        resp = self.client.get("/api/oauth/authorize/github")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("auth_url", data)

        parsed = urlparse(data["auth_url"])
        q = parse_qs(parsed.query)
        self.assertEqual(q["response_type"][0], "code")
        self.assertIn("client_id", q)
        self.assertIn("state", q)
        self.assertTrue(OauthConnection.objects.filter(status=OauthConnection.PENDING).exists())

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_success(self, mock_head):
        """Returns a 42 authorization URL and creates a pending OAuth connection."""
        mock_head.return_value.status_code = 200
        resp = self.client.get("/api/oauth/authorize/42")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("auth_url", data)
        self.assertTrue(OauthConnection.objects.filter(status=OauthConnection.PENDING).exists())

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_api_unavailable(self, mock_head):
        """Redirects with code=503 when the 42 provider health-check fails."""
        mock_head.return_value.status_code = 500
        resp = self.client.get("/api/oauth/authorize/42", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(settings.ERROR_REDIRECT_URL, resp["Location"])
        self.assertIn("code=503", resp["Location"])

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_connection_error(self, mock_head):
        """Redirects with code=503 when the 42 provider health-check raises a network error."""
        mock_head.side_effect = requests.RequestException("boom")
        resp = self.client.get("/api/oauth/authorize/42", follow=False)
        self.assertEqual(resp.status_code, 302)
        self.assertIn(settings.ERROR_REDIRECT_URL, resp["Location"])
        self.assertIn("code=503", resp["Location"])

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_github_head_405_then_get_200(self, mock_head, mock_get):
        """Falls back to GET when HEAD is not allowed and returns an authorization URL on success."""
        mock_head.return_value.status_code = 405
        mock_get.return_value.status_code = 200
        resp = self.client.get("/api/oauth/authorize/github")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("auth_url", resp.json())

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_authorize_42_redirect_status_tolerated(self, mock_head):
        """Treats a 3xx health-check response as reachable and returns an authorization URL."""
        mock_head.return_value.status_code = 301
        resp = self.client.get("/api/oauth/authorize/42")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("auth_url", resp.json())

    def test_oauth_callback_unsupported_platform(self):
        """Returns 404 on callback for an unknown platform."""
        resp = self.client.get("/api/oauth/callback/unsupported?code=test&state=test")
        self.assertEqual(resp.status_code, 404)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_with_oauth_error(self, mock_head):
        """Redirects with code=422 when the provider returns an OAuth error to the callback."""
        mock_head.return_value.status_code = 200
        resp = self.client.get(
            "/api/oauth/callback/github?error=access_denied&error_description=User%20denied%20access"
        )
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=access_denied%3A%20User%20denied%20access", resp.url)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_various_oauth_errors(self, mock_head):
        """Redirects with code=422 for a variety of standard OAuth error types."""
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
        for err, desc in cases:
            with self.subTest(error=err):
                resp = self.client.get(
                    f"/api/oauth/callback/github?error={err}&error_description={desc.replace(' ', '%20')}"
                )
                self.assertEqual(resp.status_code, 302)
                self.assertIn(f"error={err}", resp.url)
                self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_missing_parameters(self, mock_head):
        """Redirects with code=422 when the callback is missing code and/or state."""
        mock_head.return_value.status_code = 200
        cases = [
            "/api/oauth/callback/github?state=test",
            "/api/oauth/callback/github?code=test",
            "/api/oauth/callback/github",
            "/api/oauth/callback/github?code=&state=test",
            "/api/oauth/callback/github?code=test&state=",
        ]
        for url in cases:
            with self.subTest(url=url):
                resp = self.client.get(url)
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=Missing%20code%20or%20state", resp.url)
                self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_invalid_state(self, mock_head):
        """Redirects with code=422 when the callback state is not found in pending OAuth connections."""
        mock_head.return_value.status_code = 200
        resp = self.client.get("/api/oauth/callback/github?code=test&state=does_not_exist")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=Invalid%20state", resp.url)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_state_platform_mismatch(self, mock_head):
        """Redirects with code=422 when the state exists but is bound to a different platform."""
        mock_head.return_value.status_code = 200
        OauthConnection.objects.create_pending_connection("github_state", "github")
        resp = self.client.get("/api/oauth/callback/42?code=test&state=github_state")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("error=Invalid%20state%20or%20platform", resp.url)
        self.assertIn("code=422", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_expired_state(self, mock_head):
        """Redirects with code=408 when the pending state is expired."""
        mock_head.return_value.status_code = 200
        oc = OauthConnection.objects.create_pending_connection("test_state", "github")
        oc.date = oc.date - timedelta(minutes=10)
        oc.save()
        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("code=408", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    def test_oauth_callback_token_request_timeout(self, mock_head):
        """Redirects with code=408 when the token request times out."""
        mock_head.return_value.status_code = 200
        with patch("users.router.endpoints.oauth2.requests.post") as mock_post, \
             patch("users.models.oauth_connection.requests.get") as mock_models_get:
            mock_post.side_effect = requests.Timeout("timeout")
            mock_models_get.return_value = self.mock_api_success
            OauthConnection.objects.create_pending_connection("timeout_state", "github")
            resp = self.client.get("/api/oauth/callback/github?code=test&state=timeout_state")
            self.assertEqual(resp.status_code, 302)
            self.assertIn("code=408", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_token_request_failures(self, mock_post, mock_head):
        """Redirects on various token endpoint failures and surfaces an error parameter."""
        mock_head.return_value.status_code = 200
        cases = [
            (400, {"error": "invalid_request", "error_description": "Invalid request"}),
            (401, {"error": "invalid_client", "error_description": "Client authentication failed"}),
            (400, {"error": "invalid_grant", "error_description": "Invalid authorization grant"}),
            (400, {"error": "unauthorized_client", "error_description": "Client not authorized"}),
            (400, {"error": "unsupported_grant_type", "error_description": "Grant type not supported"}),
            (500, {"error": "server_error", "error_description": "Internal server error"}),
        ]
        for status, payload in cases:
            with self.subTest(status=status, payload=payload):
                mock_post.return_value = MagicMock(status_code=status)
                mock_post.return_value.json.return_value = payload
                state = f"state_{payload['error']}"
                OauthConnection.objects.create_pending_connection(state, "github")
                resp = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_callback_user_info_failures(self, mock_models_get, mock_post, mock_head):
        """Redirects when the user info endpoint returns non-200 responses."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success
        cases = [401, 403, 404, 429, 500, 502, 503]
        for status in cases:
            with self.subTest(status=status):
                user_info_fail = MagicMock(status_code=status)
                mock_models_get.side_effect = [user_info_fail]
                state = f"state_ui_{status}"
                OauthConnection.objects.create_pending_connection(state, "github")
                resp = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(resp.status_code, 302)
                self.assertIn("error=", resp.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_callback_github_success_new_user(self, mock_models_get, mock_post, mock_head):
        """Creates a new GitHub user and completes the callback successfully."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success
        user_info_ok = MagicMock(status_code=200)
        user_info_ok.json.return_value = self.mock_github_user
        avatar_ok = MagicMock(status_code=200)
        avatar_ok.content = b"fake_avatar"
        mock_models_get.side_effect = [user_info_ok, avatar_ok]
        OauthConnection.objects.create_pending_connection("test_state", "github")
        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(resp.status_code, 302)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_callback_42_success_new_user(self, mock_models_get, mock_post, mock_head):
        """Creates a new 42 user and completes the callback successfully."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success
        user_info_ok = MagicMock(status_code=200)
        user_info_ok.json.return_value = self.mock_42_user
        avatar_ok = MagicMock(status_code=200)
        avatar_ok.content = b"fake_avatar"
        mock_models_get.side_effect = [user_info_ok, avatar_ok]
        OauthConnection.objects.create_pending_connection("test_state", "42")
        resp = self.client.get("/api/oauth/callback/42?code=test&state=test_state")
        self.assertEqual(resp.status_code, 302)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_callback_existing_user(self, mock_models_get, mock_post, mock_head):
        """Reuses an existing user on successful GitHub callback and completes with a redirect."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success
        User.objects.create_user("testuser", email="test@example.com", password="test123")
        user_info_ok = MagicMock(status_code=200)
        user_info_ok.json.return_value = self.mock_github_user
        avatar_ok = MagicMock(status_code=200)
        avatar_ok.content = b"fake_avatar"
        mock_models_get.side_effect = [user_info_ok, avatar_ok]
        OauthConnection.objects.create_pending_connection("test_state", "github")
        resp = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(resp.status_code, 302)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_callback_concurrent_requests_same_state(self, mock_models_get, mock_post, mock_head):
        """Ensures a repeated callback with the same state does not pass validation twice."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success
        user_info_ok = MagicMock(status_code=200)
        user_info_ok.json.return_value = self.mock_github_user
        avatar_ok = MagicMock(status_code=200)
        avatar_ok.content = b"fake_avatar"
        mock_models_get.side_effect = [user_info_ok, avatar_ok]
        state = "concurrent_state"
        OauthConnection.objects.create_pending_connection(state, "github")
        r1 = self.client.get(f"/api/oauth/callback/github?code=c1&state={state}")
        self.assertEqual(r1.status_code, 302)
        r2 = self.client.get(f"/api/oauth/callback/github?code=c2&state={state}")
        self.assertEqual(r2.status_code, 302)
        self.assertTrue("error=Invalid%20state" in r2.url or "error=State%20already%20used" in r2.url)

    @patch("users.router.endpoints.oauth2.requests.head")
    @patch("users.router.endpoints.oauth2.requests.post")
    @patch("users.models.oauth_connection.requests.get")
    def test_oauth_state_reuse_prevention(self, mock_models_get, mock_post, mock_head):
        """Marks a state as consumed by the first successful callback and rejects reuse on the second attempt."""
        mock_head.return_value.status_code = 200
        mock_post.return_value = self.mock_token_success

        user_info_ok = MagicMock(status_code=200)
        user_info_ok.json.return_value = self.mock_github_user
        avatar_ok = MagicMock(status_code=200)
        avatar_ok.content = b"fake_avatar"
        mock_models_get.side_effect = [user_info_ok, avatar_ok, user_info_ok, avatar_ok]

        state = "reuse_state"
        oc = OauthConnection.objects.create_pending_connection(state, "github")

        r1 = self.client.get(f"/api/oauth/callback/github?code=c1&state={state}", follow=False)
        self.assertEqual(r1.status_code, 302)

        oc.refresh_from_db()
        self.assertEqual(oc.status, OauthConnection.CONNECTED)

        r2 = self.client.get(f"/api/oauth/callback/github?code=c2&state={state}", follow=False)
        self.assertEqual(r2.status_code, 302)
        self.assertTrue("error=Invalid%20state" in r2.url or "error=State%20already%20used" in r2.url)
        self.assertIn("code=422", r2.url)
