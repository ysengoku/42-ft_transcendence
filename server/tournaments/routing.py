from django.urls import re_path

tournament_router = Router()

websocket_urlpatterns = [
    re_path(r"ws/tournament/$", consumers.TournamentConsumer.as_asgi()),
    re_path(r"ws/tournament/(?P<tournament_id>[^/]+)/$",
            consumers.TournamentConsumer.as_asgi()),
]
