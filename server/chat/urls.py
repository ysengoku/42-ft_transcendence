from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    # JUST FORT TESTING
    path("<str:room_name>/", views.room, name="room"),
    # JUST FORT TESTING
    # path("/", views.room, name="room"),
    path("notifications/test", views.notifications_view, name="notifications"),
]
