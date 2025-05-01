# server/tournaments/router/endpoints/tournaments.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from tournaments.models import (
    Tournament,
    TournamentCreatedSchema,
    TournamentCreateSchema,
)
from users.router.utils import _create_json_response_with_tokens
from users.schemas import ProfileMinimalSchema

tournaments_router = Router()


@tournaments_router.post(
    "",
    response={201: TournamentCreatedSchema, 400: MessageSchema},
)
def create_tournament(request, data: TournamentCreateSchema):
    user = request.auth
    if not user:
        raise HttpError(401, "Authentication required")

    # Instanciation without save to check if everything's ok before saving
    tournament = Tournament(
        name=data.tournament_name,
        creator=user,
        required_participants=data.required_participants,
        status="lobby",
        date=timezone.now(),
    )

    try:
        tournament.full_clean()  # Call clean() and all models validations
        tournament.save()
    except ValidationError as e:
        raise HttpError(422, str(e))

    creator = user.profile.to_profile_minimal_schema()
    data = {
        "creator": creator,
        "tournament_id": str(tournament.id),
        "tournament_name": data.tournament_name,
        "required_participants": data.required_participants,
        "status": "lobby",
    }
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "tournament_global",
        {
            "type": "tournament.broadcast",
            "action": "tournament_created",
            "data": data,
        },
    )
    return JsonResponse(data, status=201)


@tournaments_router.get("/{tournament_id}", response=TournamentCreatedSchema)
def get_tournament(request, tournament_id: str):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return 404, {"message": "Tournament not found"}
    return tournament
