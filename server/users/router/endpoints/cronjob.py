from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from ninja import Router
from ninja.security import HttpBearer

from users.service import check_inactive_users

cronjob_router = Router()


class CronAuth(HttpBearer):
    def authenticate(self, request, token):
        if token == settings.CRON_SECRET:
            return token
        return None


@cronjob_router.delete("/cron/check-inactive-users", auth=CronAuth())
@csrf_exempt
def trigger_inactive_users_check(request):
    check_inactive_users()
    return {"status": "ok"}
