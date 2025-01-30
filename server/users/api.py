from django.core.exceptions import PermissionDenied, RequestDataTooBig, ValidationError
from django.http import HttpRequest, HttpResponse
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
    UpdateUserChema,
    UsernameSchema,
    ValidationErrorMessageSchema,
)


class CookieKey(APIKeyCookie):
    param_name = "access_token"

    def authenticate(self, request, access_token: str):
        if verify_jwt(access_token):
            return True
        return None


api = NinjaAPI(auth=CookieKey(), csrf=True)


# TODO: add secure options for the cookie
@api.post("login", response={200: ProfileMinimalSchema, 401: Message}, auth=None)
@ensure_csrf_cookie
@csrf_exempt
def login(request: HttpRequest, credentials: LoginSchema):
    try:
        user = User.objects.get_by_natural_key(credentials.username)
    except User.DoesNotExist as exc:
        raise HttpError(401, "Username or password are not correct.") from exc

    is_password_correct = user.check_password(credentials.password)
    if not is_password_correct:
        raise HttpError(401, "Username or password are not correct.")

    token = create_jwt(user.username)
    response = HttpResponse("Success")
    response.set_cookie("access_token", token)
    return response


# TODO: delete endpoint
@api.get("users", response=list[ProfileMinimalSchema])
def get_users(request: HttpRequest):
    """
    WARNING: temporary endpoint. At the moment in returns a list of all users for the testing purposes.
    """
    return Profile.objects.prefetch_related("user").all()


@api.get("users/{username}", response={200: ProfileFullSchema, 404: Message})
def get_user(request: HttpRequest, username: str):
    """
    Gets a specific user by username.
    """
    try:
        return User.objects.get_by_natural_key(username).profile
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc


@api.post(
    "users",
    response={201: ProfileMinimalSchema, 422: list[ValidationErrorMessageSchema]},
)
def register_user(request: HttpRequest, data: SignUpSchema):
    """
    Creates a new user.
    """
    user = User(username=data.username, email=data.email)
    user.set_password(data.password)
    user.full_clean()
    user.save()
    return 201, user.profile


# TODO: add authorization to settings change
@api.post(
    "users/{username}",
    response={200: ProfileMinimalSchema, frozenset({401, 404, 413}): Message, 422: list[ValidationErrorMessageSchema]},
)
def update_user(
    request: HttpRequest,
    username: str,
    data: Form[UpdateUserChema],
    new_profile_picture: UploadedFile | None = File(description="User profile picture.", default=None),
):
    """
    Udates settings of the user.
    Maximum size of the uploaded avatar is 10mb. Anything bigger will return 413 error.
    """
    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc

    try:
        user.update_user(data, new_profile_picture)
    except PermissionDenied as exc:
        raise HttpError(401, "Old password is invalid.") from exc
    except RequestDataTooBig as exc:
        raise HttpError(413, "File is too big. Please upload a file that weights less than 10mb.") from exc

    return user.profile


@api.get("users/{username}/friends", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_friends(request: HttpRequest, username: str):
    """
    Gets friends of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/friends?limit=10&offset=0` will get 10 friends from the very first one.
    """
    try:
        user = User.objects.get_by_natural_key(username)
        return user.profile.friends.all()
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc


# TODO: add auth
@api.post("users/{username}/friends", response={201: ProfileMinimalSchema, 404: Message})
def add_friend(request: HttpRequest, username: str, user_to_add: UsernameSchema):
    """
    Adds user as a friend.
    """
    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc

    try:
        friend = User.objects.get_by_natural_key(user_to_add.username).profile
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {user_to_add.username} not found.") from exc

    user.profile.friends.add(friend)
    return 201, friend


# TODO: add auth
@api.delete("users/{username}/friends/{friend_to_remove}", response={204: None, 404: Message})
def remove_from_friends(request: HttpRequest, username: str, friend_to_remove: str):
    """
    Deletes user from a friendlist.
    """
    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc

    try:
        friend = User.objects.get_by_natural_key(friend_to_remove).profile
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {friend_to_remove} not found.") from exc

    user.profile.friends.remove(friend)
    return 204, None


@api.get("users/{username}/blocked_users", response={200: list[ProfileMinimalSchema], 404: Message})
@paginate
def get_blocked_users(request: HttpRequest, username: str):
    """
    Gets blocked users of specific user.
    Paginated by the `limit` and `offset` settings.
    For example, `/users/{username}/blocked_users?limit=10&offset=0` will get 10 blocked users from the very first one.
    """
    try:
        user = User.objects.get_by_natural_key(username)
        return user.profile.blocked_users.all()
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc


# TODO: add auth
@api.post("users/{username}/blocked_users", response={201: ProfileMinimalSchema, 404: Message})
def add_to_blocked_users(request: HttpRequest, username: str, user_to_add: UsernameSchema):
    """
    Adds user to the blocklist.
    """
    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc

    try:
        blocked_user = User.objects.get_by_natural_key(user_to_add.username).profile
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {user_to_add.username} not found.") from exc

    user.profile.blocked_users.add(blocked_user)
    return 201, blocked_user


# TODO: add auth
@api.delete("users/{username}/blocked_users/{blocked_user_to_remove}", response={204: None, 404: Message})
def remove_from_blocked_users(request: HttpRequest, username: str, blocked_user_to_remove: str):
    """
    Deletes user from a blocklist.
    """
    try:
        user = User.objects.get_by_natural_key(username)
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {username} not found.") from exc

    try:
        blocked_user = User.objects.get_by_natural_key(blocked_user_to_remove).profile
    except User.DoesNotExist as exc:
        raise HttpError(404, f"User {blocked_user_to_remove} not found.") from exc

    user.profile.blocked_users.remove(blocked_user)
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
