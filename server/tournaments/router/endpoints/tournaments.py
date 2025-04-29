# server/tournaments/router/endpoints/tournaments.py

from django.core.exceptions import ValidationError
from ninja import Router
from ninja.errors import HttpError

from common.schemas import MessageSchema
from tournaments.models import Tournament, TournamentCreatedSchema, TournamentCreateSchema

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
                    "tournament_name": tournament_name,
                    "required_participants": required_participants,
            },
        },
    )
    return 201, {"tournament_id": str(tournament.id)}
