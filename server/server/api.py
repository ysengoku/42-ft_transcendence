"""
Has global api object that gathers routes from all of the applications.
Contains the default exception handlers for some of the possible errors.
"""

import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import HttpRequest
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, HttpError
from ninja.errors import ValidationError as NinjaValidationError

from chat.router import chat_app_router
from pong.router import pong_app_router
from tournaments.router import tournaments_app_router
from users.middleware import JWTEndpointsAuthMiddleware
from users.router import users_app_router

# conditionally hide the docs in production build
if settings.DEBUG:
    api = NinjaAPI(auth=JWTEndpointsAuthMiddleware(), csrf=True)
else:
    api = NinjaAPI(auth=JWTEndpointsAuthMiddleware(), csrf=True, docs_url=None)

api.add_router("", router=users_app_router)
api.add_router("", router=chat_app_router)
api.add_router("", router=pong_app_router)
api.add_router("", router=tournaments_app_router)

logger = logging.getLogger("server")


@api.exception_handler(HttpError)
def handle_http_error_error(request: HttpRequest, exc: HttpError):
    return api.create_response(
        request,
        {"msg": exc.message},
        status=exc.status_code,
    )


@api.exception_handler(AuthenticationError)
def handle_authentication_error(request: HttpRequest, exc: AuthenticationError):
    message = str(exc) if str(exc) else "Unauthorized."
    return api.create_response(
        request,
        {"msg": message},
        status=401,
    )


@api.exception_handler(ValidationError)
def handle_django_validation_error(request: HttpRequest, exc: ValidationError):
    err_response = []

    if hasattr(exc, "message_dict"):
        for key in exc.message_dict:
            err_response.extend(
                {"type": "validation_error", "loc": ["body", key], "msg": msg} for msg in exc.message_dict[key]
            )
    elif hasattr(exc, "messages"):
        for msg in exc.messages:
            err_response.append({"type": "validation_error", "loc": ["body"], "msg": msg})  # noqa: PERF401
    else:
        err_response.append({"type": "validation_error", "loc": ["body"], "msg": str(exc)})

    return api.create_response(request, err_response, status=422)


@api.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request: HttpRequest, exc: NinjaValidationError):
    return api.create_response(request, exc.errors, status=422)
