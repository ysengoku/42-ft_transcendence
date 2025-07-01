from django.urls import re_path
# from django.urls import path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/tournament/$", consumers.TournamentConsumer.as_asgi()),
    re_path(r"ws/tournament/(?P<tournament_id>[^/]+)", consumers.TournamentConsumer.as_asgi()),
    # path("ws/tournament/", consumers.TournamentConsumer.as_asgi()),
    # path("ws/tournament/<uuid:tournament_id>/", consumers.TournamentConsumer.as_asgi()),
]
