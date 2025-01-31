from django.core.exceptions import PermissionDenied, RequestDataTooBig, ValidationError
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import File, Form, NinjaAPI
from ninja.errors import HttpError
from ninja.errors import ValidationError as NinjaValidationError
from ninja.files import UploadedFile
from ninja.pagination import paginate
from ninja.security import APIKeyCookie

from .jwt import create_jwt, verify_jwt
from .models import Profile, User
from .schemas import (
    LoginSchema,
    Message,
    ProfileFullSchema,
    ProfileMinimalSchema,
    SignUpSchema,
    SlugIdSchema,
    UpdateUserChema,
    ValidationErrorMessageSchema,
)


class CookieKey(APIKeyCookie):
    param_name = "access_token"

    def authenticate(self, request, access_token: str):
        if verify_jwt(access_token):
            return True
        return None


api = NinjaAPI(auth=CookieKey(), csrf=True)


def get_user_by_slug_id_or_404(slug_id: str):
    user = User.objects.find_by_slug_id(slug_id)
    if not user:
        raise HttpError(404, f"User with id {slug_id} not found.")
    return user

# TODO: check return values of verify_jwt and create_jwt
# TODO: add secure options for the cookie
@api.post("login", response={200: ProfileMinimalSchema, 401: Message}, auth=None)
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


# TODO: delete endpoint
@api.get("users", response=list[ProfileMinimalSchema])
def get_users(request: HttpRequest):
    """
    WARNING: temporary endpoint. At the moment in returns a list of all users for the testing purposes.
    """
    return Profile.objects.prefetch_related("user").all()


@api.get("users/{slug_id}", response={200: ProfileFullSchema, 404: Message})
def get_user(request: HttpRequest, slug_id: str):
    """
    Gets a specific user by slug_id.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile


@api.post(
    "users",
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


# TODO: add authorization to settings change
@api.post(
    "users/{slug_id}",
    response={200: ProfileMinimalSchema, frozenset({401, 404, 413}): Message, 422: list[ValidationErrorMessageSchema]},
)
def update_user(
    request: HttpRequest,
    slug_id: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    """
    Udates settings of the user.
    Maximum size of the uploaded avatar is 10mb. Anything bigger will return 413 error.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied as exc:
        raise HttpError(401, "Old password is invalid.") from exc
    except RequestDataTooBig as exc:
        raise HttpError(413, "File is too big. Please upload a file that weights less than 10mb.") from exc

    return user.profile


@api.get("users/{slug_id}/friends", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_friends(request: HttpRequest, slug_id: str):
    """
    Gets friends of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{slug_id}/friends?limit=10&offset=0` will get 10 friends from the very first one.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile.friends.all()


# TODO: add auth
@api.post("users/{slug_id}/friends", response={201: ProfileMinimalSchema, frozenset({404, 422}): Message})
def add_friend(request: HttpRequest, slug_id: str, user_to_add: SlugIdSchema):
    """
    Adds user as a friend.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    friend = get_user_by_slug_id_or_404(user_to_add.slug_id)

    err_msg = user.profile.add_friend(friend.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, friend


# TODO: add auth
@api.delete("users/{slug_id}/friends/{friend_to_remove}", response={204: None, frozenset({404, 422}): Message})
def remove_from_friends(request: HttpRequest, slug_id: str, friend_to_remove: str):
    """
    Deletes user from a friendlist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    friend = get_user_by_slug_id_or_404(friend_to_remove.slug_id)

    err_msg = user.profile.remove_friend(friend.proile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None


@api.get("users/{slug_id}/blocked_users", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_blocked_users(request: HttpRequest, slug_id: str):
    """
    Gets blocked users of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{slug_id}/blocked_users?limit=10&offset=0` will get 10 blocked users from the very first one.
    """
    user = get_user_by_slug_id_or_404(slug_id)
    return user.profile.blocked_users.all()


# TODO: add auth
@api.post("users/{slug_id}/blocked_users", response={201: ProfileMinimalSchema, frozenset({404, 422}): Message})
def add_to_blocked_users(request: HttpRequest, slug_id: str, user_to_add: SlugIdSchema):
    """
    Adds user to the blocklist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    blocked_user = get_user_by_slug_id_or_404(user_to_add.slug_id)

    err_msg = user.profile.block_user(blocked_user.profile)
    if err_msg:
        raise HttpError(422, err_msg)
    return 201, blocked_user


# TODO: add auth
@api.delete(
    "users/{slug_id}/blocked_users/{blocked_user_to_remove}",
    response={204: None, frozenset({404, 422}): Message},
)
def remove_from_blocked_users(request: HttpRequest, slug_id: str, blocked_user_to_remove: str):
    """
    Deletes user from a blocklist.
    """
    user = get_user_by_slug_id_or_404(slug_id)

    blocked_user = get_user_by_slug_id_or_404(blocked_user_to_remove.slug_id)

    err_msg = user.profile.unblock_user(blocked_user)
    if err_msg:
        raise HttpError(422, err_msg)
    return 204, None


@api.exception_handler(HttpError)
def handle_http_error_error(request: HttpRequest, exc: HttpError):
    return api.create_response(
        request,
        {"msg": exc.message},
        status=exc.status_code,
    )


@api.exception_handler(ValidationError)
def handle_django_validation_error(request: HttpRequest, exc: ValidationError):
    err_response = []
    for key in exc.message_dict:
        err_response.extend(
            {"type": "validation_error", "loc": ["body", "payload", key], "msg": msg} for msg in exc.message_dict[key]
        )

    return api.create_response(request, err_response, status=422)


@api.exception_handler(NinjaValidationError)
def handle_ninja_validation_error(request: HttpRequest, exc: NinjaValidationError):
    return api.create_response(request, exc.errors, status=422)
