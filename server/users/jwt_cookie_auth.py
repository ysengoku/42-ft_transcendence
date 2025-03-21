from ninja.security import APIKeyCookie

from users.models import RefreshToken, User


class JwtCookieAuth(APIKeyCookie):
    """
    What is returned from `authenticate` method of this class is going to be located on `request.auth`.
    """

    param_name = "access_token"

    def authenticate(self, request, access_token: str):
        payload = RefreshToken.objects.verify_access_token(access_token)

        user = User.objects.for_id(payload["sub"]).first()
        if not user:
            return None
        return user
