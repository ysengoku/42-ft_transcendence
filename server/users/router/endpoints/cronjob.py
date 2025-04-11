from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ninja import Router
from ninja.security import HttpBearer

from chat.consumers import check_inactive_users

cronjob_router = Router()


class CronAuth(HttpBearer):
    def authenticate(self, request, token):
        if token == settings.CRON_SECRET:
            return token
        return None


@csrf_exempt
@cronjob_router.delete("/cron/check-inactive-users", auth=CronAuth())
def trigger_inactive_users_check(request):
    check_inactive_users()
    return {"status": "ok"}

#
# @cronjob_router.delete("/cron/check-inactive-users", auth=None, response={200: dict, 401: dict})
# def trigger_inactive_users_check(request):
#     cron_token = request.headers.get("X-Cron-Token", "")
#     if cron_token != settings.CRON_SECRET:
#         return JsonResponse({"error": "Invalid cron token"}, status=401)
#     check_inactive_users()
#     return JsonResponse({"status": "ok"})
