
from http import HTTPStatus

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from chat.views import notifications_view

User = get_user_model()


class TestNotificationsViewTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username="testuser", password="12345")

    def test_notifications_view(self):
        request = self.factory.get("/chat/notifications/test/")
        request.user = self.user  # Simuler un utilisateur connecté
        response = notifications_view(request)
        assert response.status_code == HTTPStatus.OK # noqa: S101
