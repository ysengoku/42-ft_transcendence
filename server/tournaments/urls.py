from django.urls import path

from .views import CreateTournamentView

urlpatterns = [
    path('api/tournament/', CreateTournamentView.as_view(),
         name='create_tournament'),
]
