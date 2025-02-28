# chat/routing.py
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/pong/(?P<match_name>\w+)/$", consumers.GameConsumer.as_asgi()),
]
