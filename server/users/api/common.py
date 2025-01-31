from ninja.errors import HttpError

from users.models import User


def get_user_by_slug_id_or_404(slug_id: str):
    user = User.objects.find_by_slug_id(slug_id)
    if not user:
        raise HttpError(404, f"User with id {slug_id} not found.")
    return user
