# chat/routing.py
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.sessions import SessionMiddlewareStack
from django.urls import re_path

from . import consumers
from .middleware import JWTAuthMiddleware

websocket_urlpatterns = [
    re_path(r"ws/events/$", consumers.UserEventsConsumer.as_asgi()),
]

# only for automatic tests
application = ProtocolTypeRouter({
    "websocket": SessionMiddlewareStack(  # Ajout du middleware de session
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns),
        ),
    ),
})
