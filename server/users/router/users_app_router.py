from ninja import Router

from .endpoints.auth import auth_router
from .endpoints.blocked_users import blocked_users_router
from .endpoints.friends import friends_router
from .endpoints.oauth2 import oauth2_router
from .endpoints.users import users_router

users_app_router = Router()

users_app_router.add_router("users", users_router)
users_app_router.add_router("", auth_router)
users_app_router.add_router("oauth", oauth2_router)

users_router.add_router("", blocked_users_router)
users_router.add_router("", friends_router)
