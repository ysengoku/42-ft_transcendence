from ninja import Router

from .endpoints.tournaments import tournaments_router

tournaments_app_router = Router()

tournaments_app_router.add_router("tournaments", tournaments_router)
