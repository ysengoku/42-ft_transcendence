from django.urls import path

from . import views

urlpatterns = [
    path("<str:match_name>/", views.match, name="match"),
]
