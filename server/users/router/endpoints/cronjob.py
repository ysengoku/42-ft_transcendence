from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from ninja import Router
from ninja.security import HttpBearer

from chat.consumers import check_inactive_users

cronjob_router = Router()


class CronAuth(HttpBearer):
    def authenticate(self, request, token):
        if token == settings.CRON_SECRET:
            return token
        return None


@cronjob_router.get("/csrf-token", auth=None, response={200: dict})
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Dedicated endpoint to get a CSRF token.
    Used by cron scripts that need a valid CSRF token.
    """
    return JsonResponse({"status": "ok"})


@csrf_exempt
@cronjob_router.delete("/cron/check-inactive-users", auth=CronAuth())
def trigger_inactive_users_check(request):
    check_inactive_users()
    return {"status": "ok"}
