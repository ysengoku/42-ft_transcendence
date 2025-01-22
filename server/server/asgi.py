"""
ASGI config for server project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # Gère les requêtes HTTP
    # Autres protocoles peuvent être ajoutés ici
    # "websocket": AuthMiddlewareStack(
    #     URLRouter(
    #         # Add routing for WebSockets here
    #     )
    # ),
})
