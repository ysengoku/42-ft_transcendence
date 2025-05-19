# chat/routing.py
from django.urls import path, re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/matchmaking/$", consumers.MatchmakingConsumer.as_asgi()),
    path("ws/pong/<uuid:game_room_id>/", consumers.GameRoomConsumer.as_asgi()),
]
