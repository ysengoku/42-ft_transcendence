
# from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
# from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase

# from chat.routing import websocket_urlpatterns
from chat.views import notifications_view

# from server.asgi import application

User = get_user_model()


class TestNotificationsViewTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser', password='12345')

    def test_notifications_view(self):
        request = self.factory.get('/chat/notifications/test/')
        request.user = self.user  # Simuler un utilisateur connecté
        response = notifications_view(request)
        self.assertEqual(response.status_code, 200)
