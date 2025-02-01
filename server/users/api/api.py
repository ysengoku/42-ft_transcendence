import jwt
from django.core.exceptions import ValidationError
from django.http import HttpRequest
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, HttpError
from ninja.errors import ValidationError as NinjaValidationError
from ninja.security import APIKeyCookie

from users.models import User

from .endpoints.auth import auth_router
from .endpoints.blocked_users import blocked_users_router
from .endpoints.friends import friends_router
from .endpoints.users import users_router
from .jwt import verify_jwt


class JwtCookieAuth(APIKeyCookie):
    param_name = "access_token"

    def authenticate(self, request, access_token: str):
        try:
            payload = verify_jwt(access_token)
        except jwt.InvalidSignatureError as  exc:
            raise AuthenticationError from exc
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationError("Session is expired. Please login again.") from exc

        user = User.objects.find_by_username(payload["sub"])
        if not user:
            return None
        return user


api_root = NinjaAPI(auth=JwtCookieAuth(), csrf=True)
api_root.add_router("users", users_router)
api_root.add_router("", auth_router)
users_router.add_router("", blocked_users_router)
users_router.add_router("", friends_router)


@api_root.exception_handler(HttpError)
def handle_http_error_error(request: HttpRequest, exc: HttpError):
    return api_root.create_response(
        request,
        {"msg": exc.message},
        status=exc.status_code,
    )


@api_root.exception_handler(AuthenticationError)
def handle_authentication_error(request: HttpRequest, exc: AuthenticationError):
    message = str(exc) if str(exc) else "Unauthorized."
    return api_root.create_response(
        request,
        {"msg": message},
        status=401,
    )


@api_root.exception_handler(ValidationError)
def handle_django_validation_error(request: HttpRequest, exc: ValidationError):
    err_response = []
    for key in exc.message_dict:
        err_response.extend(
            {"type": "validation_error", "loc": ["body", "payload", key], "msg": msg} for msg in exc.message_dict[key]
        )

    return api_root.create_response(request, err_response, status=422)


@api_root.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request: HttpRequest, exc: NinjaValidationError):
    return api_root.create_response(request, exc.errors, status=422)
