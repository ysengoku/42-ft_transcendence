from ninja import Router

from .endpoints.game_stats import game_stats_router

pong_app_router = Router()

pong_app_router.add_router("game_stats", game_stats_router)
