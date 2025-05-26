# server/tournaments/router/endpoints/tournaments.py
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Prefetch
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import paginate

from common.schemas import MessageSchema, ValidationErrorMessageSchema
from tournaments.models import Bracket, Participant, Round, Tournament
from tournaments.schemas import TournamentCreateSchema, TournamentSchema

tournaments_router = Router()


@tournaments_router.post(
    "",
    response={
        201: TournamentSchema,
        frozenset({400, 401, 403}): MessageSchema,
        422: ValidationErrorMessageSchema,
    },
)
def create_tournament(request, data: TournamentCreateSchema):
    """
    Creates a tournament. The `required_participants` should be either 4 or 8.
    """
    user = request.auth

    if Tournament.objects.get_active_tournament(user.profile):
        raise HttpError(
            403, "You can't be a participant in multiple active tournaments.")

    tournament = Tournament.objects.validate_and_create(
        tournament_name=data.name,
        creator=user.profile,
        required_participants=data.required_participants,
        alias=data.alias,
    )

    ws_data = {
        "creator": {
            "alias": data.alias,
            "avatar": user.profile.avatar,
        },
        "id": str(tournament.id),
        "name": data.name,
        "required_participants": data.required_participants,
        "status": Tournament.PENDING,
    }
    # Rounds creation
    minimum_num_participants = 4
    num_rounds = 2 if data.required_participants == minimum_num_participants else 3
    for round_num in range(1, num_rounds + 1):
        Round.objects.create(tournament=tournament,
                             number=round_num, status=Round.PENDING)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "tournament_global",
        {
            "type": "tournament_broadcast",
            "data": ws_data,
        },
    )
    return 201, tournament


@tournaments_router.get("/{tournament_id}", response={200: TournamentSchema, 404: MessageSchema})
def get_tournament(request, tournament_id: UUID):
    try:
        tournament: Tournament = (
            Tournament.objects.select_related("creator", "creator__user")
            .prefetch_related(
                "rounds__brackets",
                "participants__profile",
            )
            .get(id=tournament_id)
        )
        return 200, tournament
    except Tournament.DoesNotExist:
        return 404, {"msg": "Tournament not found"}


@tournaments_router.get("", response={200: list[TournamentSchema]})
@paginate
def get_all_tournaments(request, status: str = "all"):
    base_qs = Tournament.objects.prefetch_related(
        Prefetch("participants",
                 queryset=Participant.objects.select_related("profile__user")),
        Prefetch(
            "rounds__brackets",
            queryset=Bracket.objects.select_related(
                "participant1__profile__user", "participant2__profile__user"),
        ),
    )
    if status in [x[0] for x in Tournament.STATUS_CHOICES]:
        base_qs = base_qs.filter(status=status)

    if not base_qs.exists():
        return 204, None

   if status != Tournament.CANCELLED:
        base_qs = base_qs.exclude(status=Tournament.CANCELLED)

    return base_qs


@tournaments_router.delete(
    "/{tournament_id}",
    response={204: None, frozenset({401, 403, 404}): MessageSchema},
)
def delete_tournament(request, tournament_id: UUID):
    user = request.auth

    try:
        tournament = Tournament.objects.get(id=tournament_id)
    except Tournament.DoesNotExist as e:
        raise HttpError(404, "Tournament not found.") from e

    if tournament.creator != user.profile:
        raise HttpError(403, "You are not allowed to cancel this tournament.")

    tournament.status = Tournament.CANCELLED
    tournament.save()
    return 204, None


@tournaments_router.post(
    "/{tournament_id}/register",
    response={204: None, frozenset({401, 403, 404}): MessageSchema},
)
def register_for_tournament(request, tournament_id: UUID, alias: str):
    user = request.auth

    with transaction.atomic():
        try:
            tournament: Tournament = Tournament.objects.select_for_update().get(id=tournament_id)
        except Tournament.DoesNotExist as e:
            raise HttpError(404, "Tournament not found.") from e

        if Tournament.objects.get_active_tournament(user.profile):
            raise HttpError(
                403, "You can't be a participant in multiple active tournaments.")

        if tournament.status != Tournament.PENDING:
            raise HttpError(403, "Tournament is not open.")

        if tournament.participants.count() >= tournament.required_participants:
            raise HttpError(403, "Tournament is full.")

        participant_or_error_str: Participant | str = tournament.add_participant(
            user.profile, alias)
        if type(participant_or_error_str) is str:
            raise HttpError(403, participant_or_error_str)

        channel_layer = get_channel_layer()
        if tournament.participants.count() == tournament.required_participants:
            tournament.status = Tournament.ONGOING
            tournament.save()
            async_to_sync(channel_layer.group_send)(
                f"tournament_{tournament_id}",
                {
                    "type": "last_registration",
                    "data": {
                        "avatar": user.profile.avatar,
                        "alias": alias,
                    },
                },
            )
        else:
            async_to_sync(channel_layer.group_send)(
                f"tournament_{tournament_id}",
                {
                    "type": "new_registration",
                    "data": {
                        "avatar": user.profile.avatar,
                        "alias": alias,
                    },
                },
            )

    return 204, None


@tournaments_router.delete(
    "/{tournament_id}/unregister",
    response={204: None, frozenset({401, 403, 404}): MessageSchema},
)
def unregister_for_tournament(request, tournament_id: UUID):
    user = request.auth

    with transaction.atomic():
        try:
            tournament: Tournament = Tournament.objects.select_for_update().get(id=tournament_id)
        except Tournament.DoesNotExist as e:
            raise HttpError(404, "Tournament not found.") from e

        if tournament.status != Tournament.PENDING:
            raise HttpError(403, "Cannot unregister from non-open tournament.")

        participant_or_error_str: dict | str = tournament.remove_participant(
            user.profile)
        if type(participant_or_error_str) is str:
            raise HttpError(403, participant_or_error_str)

        channel_layer = get_channel_layer()
        if tournament.participants.count() < 1:
            tournament.status = Tournament.CANCELLED
            tournament.save()
            async_to_sync(channel_layer.group_send)(
                f"tournament_{tournament_id}", {"type": "tournament_cancelled"})
        else:
            async_to_sync(channel_layer.group_send)(
                f"tournament_{tournament_id}", {"type": "user_left"})

    return 204, None
