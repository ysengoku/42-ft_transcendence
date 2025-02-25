"""
Common utility functions that are used by the routers.
"""

from django.db import models
from django.http import HttpRequest
from ninja.errors import HttpError

from users.models import Profile, User


def allow_only_for_self(request: HttpRequest, username: str):
    user: User = request.auth
    if user.username.lower() != username.lower():
        raise HttpError(403, "Forbidden.")
    return request.auth


def get_queryset_by_username_or_404(model: models.Model, username: str):
    user = model.objects.for_username(username)
    if not user.exists():
        raise HttpError(404, f"User {username} not found.")
    return user


def get_user_queryset_by_username_or_404(username: str):
    return get_queryset_by_username_or_404(User, username)


def get_profile_queryset_by_username_or_404(username: str):
    return get_queryset_by_username_or_404(Profile, username)
