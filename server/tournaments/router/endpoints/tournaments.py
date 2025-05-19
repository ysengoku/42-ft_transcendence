# server/tournaments/router/endpoints/tournaments.py
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.exceptions import ValidationError
from django.db.models import Prefetch, Q
from django.http import JsonResponse
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from common.schemas import MessageSchema, ProfileMinimalSchema
from tournaments.models import (Bracket, Participant, Round, Tournament,
                                TournamentCreatedSchema,
                                TournamentCreateSchema)
from tournaments.schemas import TournamentSchema
from users.router.utils import _create_json_response_with_tokens

tournaments_router = Router()


@tournaments_router.post(
    "",
    response={201: TournamentSchema, 400: MessageSchema},
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
        msg = e.messages[0] if len(e.messages) == 1 else " ".join(e.messages)
        raise HttpError(422, msg)

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


@tournaments_router.get(
    "/{tournament_id}",
    response={
        200: TournamentSchema,
        404: MessageSchema
    }
)
def get_tournament(request, tournament_id: UUID):
    try:
        tournament = Tournament.objects.select_related(
            'creator__profile__user'
        ).prefetch_related(
            'rounds__brackets_rounds',
            'tournament_participants__profile__profile',
        ).get(id=tournament_id)
        return 200, tournament
    except Tournament.DoesNotExist:
        return 404, {"msg": "Tournament not found"}


@tournaments_router.get("", response={200: list[TournamentSchema], 204: None})
@paginate
def get_all_tournaments(request, status: str = "all"):
    return {}
    # base_qs = Tournament.objects.prefetch_related(
    #     Prefetch(
    #         'tournament_participants',
    #         queryset=Participant.objects.select_related('profile__user')
    #     ),
    #     Prefetch(
    #         'tournament_rounds__brackets',
    #         queryset=Bracket.objects.select_related(
    #             'participant1__profile__user',
    #             'participant2__profile__user'
    #         )
    #     )
    # )
    # # for t in base_qs:
    # #     for p in t.tournament_participants.all():
    # #         print("Participant:", p.alias, "Profile:", p.user, "User:", getattr(
    # #             p.user, 'user', None), "Username:", getattr(getattr(p.user, 'user', None), 'username', None))
    # if status != "all":
    #     base_qs = base_qs.filter(status=status)
    #
    # if not base_qs.exists():
    #     return 204, None
    # return base_qs

    # @tournaments_router.get("", response={200: list[TournamentSchema], 204: None})
    # @paginate
    # def get_all_tournaments(request, status: str = "all"):
    #     """
    #     Gets tournaments, paginated. Filter by status if provided.
    #     """
    #     base_qs = Tournament.objects.prefetch_related(
    #         Prefetch('participants',
    #                  queryset=Participant.objects.prefetch_related('user__user')),
    #         Prefetch('tournament_rounds__brackets',
    #                  queryset=Bracket.objects.select_related(
    #                      'participant1__user__user',
    #                      'participant2__user__user'
    #                  ))
    #     )
    #
    #     if status != "all":
    #         base_qs = base_qs.filter(status=status)
    #
    #     if not base_qs.exists():
    #         return 204, None
    #     return base_qs
    #


@tournaments_router.delete(
    "/{tournament_id}",
    response={204: None, 401: MessageSchema,
              403: MessageSchema, 404: MessageSchema},
)
def delete_tournament(request, tournament_id: UUID):
    user = request.auth
    if not user:
        raise HttpError(401, "Authentication required")

    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist:
        raise HttpError(404, "Tournament not found")

    if tournament.creator != user:
        raise HttpError(403, "You are not allowed to delete this tournament.")

    tournament.delete()
    return 204, None
