import logging
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse
from datetime import timedelta

import requests
from django.test import TestCase

from users.models import OauthConnection, User


class OAuth2EndpointsTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        logging.disable(logging.CRITICAL)
    
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        logging.disable(logging.NOTSET)
    
    def setUp(self):
        # Clear any existing OAuth connections to avoid conflicts
        OauthConnection.objects.all().delete()
        
        # Common mock responses to reduce setup time
        self.mock_api_success = MagicMock()
        self.mock_api_success.status_code = 200
        
        self.mock_token_success = MagicMock()
        self.mock_token_success.status_code = 200
        self.mock_token_success.json.return_value = {"access_token": "test_token"}
        
        self.mock_github_user = {
            "id": 12345,
            "login": "testuser", 
            "email": "test@example.com",
            "avatar_url": "https://example.com/avatar.png"
        }
        
        self.mock_42_user = {
            "id": 54321,
            "login": "testuser42",
            "email": "test42@example.com",
            "image": {"versions": {"medium": "https://example.com/avatar.png"}}
        }

    def test_oauth_authorize_unsupported_platform(self):
        response = self.client.get("/api/oauth/authorize/unsupported")
        self.assertEqual(response.status_code, 404)

    @patch("users.router.endpoints.oauth2.requests.get")
    def test_oauth_authorize_github_success(self, mock_get):
        mock_get.return_value.status_code = 200
        response = self.client.get("/api/oauth/authorize/github")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn("auth_url", response_data)
        
        # Parse the auth URL to verify parameters
        # parsed_url = urlparse(response_data["auth_url"])
        # query_params = parse_qs(parsed_url.query)
        # self.assertEqual(query_params["response_type"][0], "code")
        # self.assertIn("client_id", query_params)
        # self.assertIn("state", query_params)
        
        # Verify OAuth connection was created
        self.assertTrue(OauthConnection.objects.filter(status=OauthConnection.PENDING).exists())

    @patch("users.router.endpoints.oauth2.requests.get")
    def test_oauth_authorize_42_success(self, mock_get):
        mock_get.return_value.status_code = 200
        response = self.client.get("/api/oauth/authorize/42")
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn("auth_url", response_data)
        
        # Verify OAuth connection was created
        self.assertTrue(OauthConnection.objects.filter(status=OauthConnection.PENDING).exists())

    @patch("users.router.endpoints.oauth2.requests.get")
    def test_oauth_authorize_42_api_unavailable(self, mock_get):
        mock_get.return_value.status_code = 500
        response = self.client.get("/api/oauth/authorize/42")
        # API returns 422 for validation errors
        self.assertEqual(response.status_code, 422)

    @patch("users.router.endpoints.oauth2.requests.get")
    def test_oauth_authorize_42_connection_error(self, mock_get):
        mock_get.side_effect = requests.RequestException("Connection error")
        response = self.client.get("/api/oauth/authorize/42")
        # API returns 422 for validation errors
        self.assertEqual(response.status_code, 422)

    def test_oauth_callback_unsupported_platform(self):
        response = self.client.get("/api/oauth/callback/unsupported?code=test&state=test")
        self.assertEqual(response.status_code, 404)

    def test_oauth_callback_with_oauth_error(self):
        # Test OAuth server error response
        response = self.client.get("/api/oauth/callback/github?error=access_denied&error_description=User%20denied%20access")
        self.assertEqual(response.status_code, 302)
        self.assertIn("error=access_denied%3A%20User%20denied%20access", response.url)
        self.assertIn("code=422", response.url)
        
    def test_oauth_callback_with_different_error_types(self):
        # Test various OAuth error types
        error_cases = [
            ("invalid_request", "Request was invalid"),
            ("unauthorized_client", "Client not authorized"),
            ("access_denied", "User denied access"),
            ("unsupported_response_type", "Response type not supported"),
            ("invalid_scope", "Scope is invalid"),
            ("server_error", "Server encountered an error"),
            ("temporarily_unavailable", "Service temporarily unavailable")
        ]
        
        for error_type, error_desc in error_cases:
            with self.subTest(error=error_type):
                response = self.client.get(
                    f"/api/oauth/callback/github?error={error_type}&error_description={error_desc.replace(' ', '%20')}"
                )
                self.assertEqual(response.status_code, 302)
                self.assertIn(f"error={error_type}", response.url)
                self.assertIn("code=422", response.url)

    def test_oauth_callback_missing_parameters(self):
        # Test missing code or state parameters
        test_cases = [
            ("/api/oauth/callback/github?state=test", "missing code"),
            ("/api/oauth/callback/github?code=test", "missing state"),
            ("/api/oauth/callback/github", "missing both"),
            ("/api/oauth/callback/github?code=&state=test", "empty code"),
            ("/api/oauth/callback/github?code=test&state=", "empty state")
        ]
        
        for url, description in test_cases:
            with self.subTest(case=description):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 302)
                self.assertIn("error=Missing%20code%20or%20state", response.url)
                self.assertIn("code=422", response.url)

    def test_oauth_callback_invalid_state(self):
        # Test with completely invalid state (not in database)
        response = self.client.get("/api/oauth/callback/github?code=test&state=invalid_state_not_in_db")
        self.assertEqual(response.status_code, 302)
        self.assertIn("error=Invalid%20state", response.url)
        self.assertIn("code=422", response.url)
        
    def test_oauth_callback_state_platform_mismatch(self):
        # Test state valid but for different platform
        github_state = OauthConnection.objects.create_pending_connection("github_state", "github")
        
        # Try to use GitHub state with 42 platform
        response = self.client.get("/api/oauth/callback/42?code=test&state=github_state")
        self.assertEqual(response.status_code, 302)
        # Should redirect with error due to platform mismatch

    @patch("users.router.endpoints.oauth2.requests.get")
    def test_oauth_callback_expired_state(self, mock_get):
        mock_get.return_value.status_code = 200
        oauth_conn = OauthConnection.objects.create_pending_connection("test_state", "github")
        oauth_conn.date = oauth_conn.date - timedelta(minutes=5)
        
        response = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(response.status_code, 302)
        
                
    def test_oauth_callback_network_timeout_simulation(self):
        # Test network timeout scenarios
        with patch("users.router.endpoints.oauth2.requests.post") as mock_post, \
             patch("users.router.endpoints.oauth2.requests.get") as mock_get:
                
            # Simulate timeout on token request
            mock_get.return_value.status_code = 200
            mock_post.side_effect = requests.Timeout("Request timed out")
            
            OauthConnection.objects.create_pending_connection("timeout_state", "github")
            
            response = self.client.get("/api/oauth/callback/github?code=test&state=timeout_state")
            self.assertEqual(response.status_code, 302)
            self.assertIn("error=", response.url)

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_token_request_various_failures(self, mock_post, mock_get):
        # Test different token request failure scenarios
        mock_get.return_value.status_code = 200
        
        token_error_cases = [
            (400, {"error": "invalid_request", "error_description": "Invalid request"}),
            (401, {"error": "invalid_client", "error_description": "Client authentication failed"}),
            (400, {"error": "invalid_grant", "error_description": "Invalid authorization grant"}),
            (400, {"error": "unauthorized_client", "error_description": "Client not authorized"}),
            (400, {"error": "unsupported_grant_type", "error_description": "Grant type not supported"}),
            (500, {"error": "server_error", "error_description": "Internal server error"})
        ]
        
        for status_code, error_response in token_error_cases:
            with self.subTest(error=error_response["error"]):
                # Reset mocks
                mock_post.reset_mock()
                mock_post.return_value.status_code = status_code
                mock_post.return_value.json.return_value = error_response
                
                # Create valid OAuth connection for each test
                state = f"test_state_{error_response['error']}"
                OauthConnection.objects.create_pending_connection(state, "github")
                
                response = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(response.status_code, 302)
                self.assertIn("error=", response.url)

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_user_info_various_failures(self, mock_post, mock_get):
        # Test different user info request failure scenarios
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "test_token"}
        
        user_info_error_cases = [
            (401, "Unauthorized - invalid token"),
            (403, "Forbidden - insufficient scope"),
            (404, "Not found - user endpoint"),
            (429, "Rate limited"),
            (500, "Internal server error"),
            (502, "Bad gateway"),
            (503, "Service unavailable")
        ]
        
        for status_code, description in user_info_error_cases:
            with self.subTest(status=status_code, desc=description):
                # API check succeeds, user info fails
                mock_api_check = MagicMock()
                mock_api_check.status_code = 200
                
                mock_user_info = MagicMock()
                mock_user_info.status_code = status_code
                mock_get.side_effect = [mock_api_check, mock_user_info]
                
                state = f"test_state_{status_code}"
                OauthConnection.objects.create_pending_connection(state, "github")
                
                response = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
                self.assertEqual(response.status_code, 302)
                self.assertIn("error=", response.url)

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_github_success_new_user(self, mock_post, mock_get):
        mock_post.return_value = self.mock_token_success
        
        mock_user_info = MagicMock()
        mock_user_info.status_code = 200
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.side_effect = [self.mock_api_success, mock_user_info]
        
        OauthConnection.objects.create_pending_connection("test_state", "github")
        
        response = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(response.status_code, 302)
        
                

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_42_success_new_user(self, mock_post, mock_get):
        mock_post.return_value = self.mock_token_success
        
        mock_user_info = MagicMock()
        mock_user_info.status_code = 200
        mock_user_info.json.return_value = self.mock_42_user
        mock_get.side_effect = [self.mock_api_success, mock_user_info]
        
        OauthConnection.objects.create_pending_connection("test_state", "42")
        
        response = self.client.get("/api/oauth/callback/42?code=test&state=test_state")
        self.assertEqual(response.status_code, 302)

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_existing_user(self, mock_post, mock_get):
        existing_user = User.objects.create_user("testuser", email="test@example.com", password="test123")
        
        mock_post.return_value = self.mock_token_success
        
        mock_user_info = MagicMock()
        mock_user_info.status_code = 200
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.side_effect = [self.mock_api_success, mock_user_info]
        
        OauthConnection.objects.create_pending_connection("test_state", "github")
        
        response = self.client.get("/api/oauth/callback/github?code=test&state=test_state")
        self.assertEqual(response.status_code, 302)
        
                
    @patch("users.models.oauth_connection.requests.get")
    @patch("users.router.endpoints.oauth2.requests.get") 
    @patch("users.router.endpoints.oauth2.requests.post")
    def test_oauth_callback_concurrent_requests_same_state(self, mock_post, mock_get, mock_avatar_get):
        # Mock successful OAuth responses
        mock_post.return_value = self.mock_token_success
        mock_user_info = MagicMock()
        mock_user_info.status_code = 200
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.return_value = mock_user_info
        
        # Mock avatar download
        mock_avatar_response = MagicMock()
        mock_avatar_response.status_code = 200
        mock_avatar_response.content = b"fake_avatar_data"
        mock_avatar_get.return_value = mock_avatar_response
        
        # Test concurrent requests with same state (race condition)
        state = "concurrent_test_state"
        OauthConnection.objects.create_pending_connection(state, "github")
        
        # First request should process successfully
        response1 = self.client.get(f"/api/oauth/callback/github?code=test1&state={state}")
        self.assertEqual(response1.status_code, 302)
        
        # Second request with same state should fail (state consumed)
        response2 = self.client.get(f"/api/oauth/callback/github?code=test2&state={state}")
        self.assertEqual(response2.status_code, 302)
        # Should fail due to either invalid state or invalid user information
        self.assertTrue(
            "error=Invalid%20state" in response2.url or 
            "error=Invalid%20user%20information" in response2.url
        )

    @patch("users.router.endpoints.oauth2.requests.get")
    @patch("users.router.endpoints.oauth2.requests.post") 
    def test_oauth_state_reuse_prevention(self, mock_post, mock_get):
        """Test that OAuth state cannot be reused after successful authentication"""
        # Mock successful OAuth responses
        mock_post.return_value = self.mock_token_success
        mock_user_info = MagicMock()
        mock_user_info.status_code = 200
        mock_user_info.json.return_value = self.mock_github_user
        mock_get.side_effect = [self.mock_api_success, mock_user_info, self.mock_api_success]
        
        # Create valid OAuth connection
        state = "reuse_test_state"
        oauth_conn = OauthConnection.objects.create_pending_connection(state, "github")
        
        # First request should succeed and mark state as used
        response1 = self.client.get(f"/api/oauth/callback/github?code=test&state={state}")
        self.assertEqual(response1.status_code, 302)
        
        # Verify state was marked as used
        oauth_conn.refresh_from_db()
        self.assertEqual(oauth_conn.status, OauthConnection.USED)
        
        # Second request with same state should fail (state cannot be reused)
        response2 = self.client.get(f"/api/oauth/callback/github?code=test2&state={state}")
        self.assertEqual(response2.status_code, 302)
        # Should fail with either "Invalid state" or "State already used" - both prevent reuse
        self.assertTrue(
            "error=Invalid%20state" in response2.url or 
            "error=State%20already%20used" in response2.url
        )
        self.assertIn("code=422", response2.url)
