# server/tournaments/router/endpoints/tournaments.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.exceptions import ValidationError
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from tournaments.models import (Tournament, TournamentCreatedSchema,
                                TournamentCreateSchema)

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
        date=timezone.now()
    )

    try:
        tournament.full_clean()  # Call clean() and all models validations
        tournament.save()
    except ValidationError as e:
        raise HttpError(400, str(e))

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "tournament_global",
        {
            "type": "tournament.broadcast",
            "action": "tournament_created",
            "data": {
                    "tournament_id": str(tournament.id),
                    "tournament_name": data.tournament_name,
                    "required_participants": data.required_participants,
            },
        },
    )
    return 201, {"tournament_id": str(tournament.id)}


@tournaments_router.get("/{tournament_id}", response=TournamentCreatedSchema)
def get_tournament(request, tournament_id: str):
    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        return 404, {"message": "Tournament not found"}
    return tournament
