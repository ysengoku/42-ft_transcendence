from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router
from ninja.errors import HttpError

from users.api.jwt import create_jwt
from users.models import User
from users.schemas import (
    LoginSchema,
    Message,
    ProfileMinimalSchema,
    SignUpSchema,
    ValidationErrorMessageSchema,
)

auth_router = Router()

# TODO: check return values of verify_jwt and create_jwt
# TODO: add secure options for the cookie
@auth_router.post("login", response={200: ProfileMinimalSchema, 401: Message}, auth=None)
@ensure_csrf_cookie
@csrf_exempt
def login(request: HttpRequest, credentials: LoginSchema):
    """
    Logs in user. Can login by username, email or slug_id.
    """
    user = User.objects.find_by_identifier(credentials.username, User.REGULAR)
    if not user:
        raise HttpError(401, "Username or password are not correct.")

    is_password_correct = user.check_password(credentials.password)
    if not is_password_correct:
        raise HttpError(401, "Username or password are not correct.")

    token = create_jwt(user.username)
    response = JsonResponse(user.profile.to_profile_minimal_schema())
    response.set_cookie("access_token", token)
    return response


@auth_router.post(
    "signup",
    response={201: ProfileMinimalSchema, 422: list[ValidationErrorMessageSchema]},
    auth=None,
)
@ensure_csrf_cookie
@csrf_exempt
def register_user(request: HttpRequest, data: SignUpSchema):
    """
    Creates a new user.
    """
    user = User.objects.fill_user_data(
        username=data.username, connection_type=User.REGULAR, email=data.email, password=data.password
    )
    user.set_password(data.password)
    user.full_clean(exclude={"slug_id"})
    user = User.objects.create_user(
        username=data.username, connection_type=User.REGULAR, email=data.email, password=data.password
    )
    user.save()
    token = create_jwt(user.username)
    response = JsonResponse(user.profile.to_profile_minimal_schema())
    response.set_cookie("access_token", token)
    return response
