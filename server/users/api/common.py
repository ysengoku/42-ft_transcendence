from ninja.errors import HttpError

from users.models import Profile, User


def allow_only_for_self(func):
    def wrapper(request, username, *args, **kwargs):
        if request.auth.username != username:
            raise HttpError(403, "Forbidden.")
        return func(request, username, *args, **kwargs)
    return wrapper


def get_queryset_by_username_or_404(model, username: str):
    user = model.objects.for_username(username)
    if not user.exists():
        raise HttpError(404, f"User {username} not found.")
    return user


def get_user_queryset_by_username_or_404(username: str):
    return get_queryset_by_username_or_404(User, username)


def get_profile_queryset_by_username_or_404(username: str):
    return get_queryset_by_username_or_404(Profile, username)
