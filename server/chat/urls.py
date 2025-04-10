from django.urls import path

from . import views
from .views import check_inactive_users_view

urlpatterns = [
    path("", views.index, name="index"),
    path("<str:room_name>/", views.room, name="room"),
    path("notifications/test", views.notifications_view, name="notifications"),
    path('api/check-inactive-users/', check_inactive_users_view, name='check_inactive_users'),
]
