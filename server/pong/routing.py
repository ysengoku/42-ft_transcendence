# chat/routing.py
from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path("ws/matchmaking/", consumers.MatchmakingConsumer.as_asgi()),
    path("ws/pong/<game_room_id>/", consumers.GameServerConsumer.as_asgi()),
]
