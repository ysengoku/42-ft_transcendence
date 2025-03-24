from django.shortcuts import render

from .models import Notification


def index(request):
    return render(request, "chat/index.html")


def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})


def notifications_view(request):
    notifications = Notification.objects.filter(user=request.user)
    return render(request, "chat/notifications.html", {"notifications": notifications})
