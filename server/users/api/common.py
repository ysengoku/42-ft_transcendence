from ninja.errors import HttpError

from users.models import User


def get_user_by_username_or_404(username: str):
    user = User.objects.find_by_username(username)
    if not user:
        raise HttpError(404, f"User {username} not found.")
    return user
