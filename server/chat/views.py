from django.http import HttpRequest
from django.shortcuts import render
from ninja import Query

from common.schemas import MessageSchema
from server.api import api
from users.jwt_cookie_auth import JWTCookieAuth

from .models import Chat, Notification


def index(request):
    return render(request, "chat/index.html")


def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})


def notifications_view(request):
    notifications = Notification.objects.filter(receiver=request.user)
    return render(request, "chat/notifications.html", {"notifications": notifications})


@api.post('/users/offline', auth=JWTCookieAuth(), response={200: MessageSchema})
def set_offline(request):
    profile = request.user.profile
    profile.is_online = False
    profile.save()
    return 200, {'msg': 'Status offline updated'}


def get_chats(request: HttpRequest):
    profile = request.auth.profile
    return Chat.objects.get_user_chats(profile)

from django.http import JsonResponse
from chat.consumers import check_inactive_users  # Importez votre fonction existante

def check_inactive_users_view(request):
    if request.method == "POST":
        check_inactive_users()  # Exécutez la logique pour vérifier les utilisateurs inactifs
        return JsonResponse({"status": "success", "message": "Inactive users checked."})
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=400)
