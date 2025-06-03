# chat/routing.py
from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path(r"ws/matchmaking/", consumers.MatchmakingConsumer.as_asgi()),
    path("ws/pong/<uuid:game_room_id>/", consumers.GameWSServerConsumer.as_asgi()),
]
