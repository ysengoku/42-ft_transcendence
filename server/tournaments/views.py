import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views import View
from ninja import Router
from ninja.errors import HttpError

from tournaments.models import Tournament

from .models import Tournament

tournament_router = Router()




@tournament_router.post("/tournaments/", response={201: dict, 401: dict})
def create_tournament(request, data: TournamentCreateSchema):
    user = request.auth  # Géré par JWTCookieAuth
    if not user:
        raise HttpError(401, "Authentication required")
    tournament = Tournament.objects.create(
        name=data.tournament_name,
        creator=user,
        max_participants=data.required_participants,
        status="lobby"
    )
    return 201, {"tournament_id": str(tournament.id)}


@tournament_router.post("/tournaments/", response={201: dict, 401: dict})
class CreateTournamentView(View):
    def post(self, request):
        user = request.auth  # Géré par JWTCookieAuth
    if not user:
        raise HttpError(401, "Authentication required")
        data = json.loads(request.body)
        tournament_name = data['tournament_name']
        required_participants = data['required_participants']
        tournament = Tournament.objects.create(
            name=tournament_name,
            creator=request.user,
            max_participants=required_participants,
            status='lobby'
        )
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tournament_global",
            {
                "type": "tournament.broadcast",
                "action": "tournament_created",
                "data": {
                    "tournament_id": str(tournament.id),
                    "tournament_name": tournament_name,
                    "required_participants": required_participants,
                }
            }
        )
        return JsonResponse({'tournament_id': str(tournament.id)}, status=201)
        return JsonResponse({'error': str(e)}, status=400)
