"""
ASGI config for server project.

It exposes the ASGI callable as a module-level variable named ``application``.
For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from channels.routing import ChannelNameRouter, ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

from users.middleware import JWTWebsocketAuthMiddleware

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django_asgi_app = get_asgi_application()

from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns  # noqa: E402
from pong.consumers.game_worker import GameConsumer  # noqa: E402
from pong.routing import websocket_urlpatterns as pong_websocket_urlpatterns  # noqa: E402

combined_patterns = chat_websocket_urlpatterns + pong_websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTWebsocketAuthMiddleware(
                URLRouter(combined_patterns),
            ),
        ),
        "channel": ChannelNameRouter(
            {
                "game": GameConsumer.as_asgi(),
            },
        ),
    },
)
