from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from chat.views import notifications_view

User = get_user_model()
HTTP_OK = 200


class TestNotificationsViewTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username="testuser", password="12345",
        )  # noqa: S106

    def test_notifications_view(self):
        request = self.factory.get("/chat/notifications/test/")
        request.user = self.user
        response = notifications_view(request)
        assert response.status_code == HTTP_OK  # noqa: S101
