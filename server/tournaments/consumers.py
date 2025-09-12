# server/tournament/consumers.py
import json
import logging
from uuid import UUID

from asgiref.sync import async_to_sync

from common.close_codes import CloseCodes
from common.guarded_websocket_consumer import GuardedWebsocketConsumer

from .models import Bracket, Participant, Tournament
from .tournament_worker import TournamentWorkerConsumer

logger = logging.getLogger("server")


class TournamentConsumer(GuardedWebsocketConsumer):
    tournaments = {}

    def connect(self):
        self.user = self.scope.get("user")
        logger.debug("Connecting %s to tournament socket", self.user)
        if not self.user or not self.user.is_authenticated:
            logger.warning("TournamentConsumer : Unauthentificated user trying to connect")
            self.close()
            return
        self.tournament_id = self.scope["url_route"]["kwargs"].get("tournament_id")
        try:
            UUID(str(self.tournament_id))
        except ValueError:
            logger.warning("Wrong uuid : %s", self.tournament_id)
            self.accept()
            self.close(CloseCodes.ILLEGAL_CONNECTION)
            return

        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %s", self.tournament_id)
            self.accept()
            self.close(CloseCodes.BAD_DATA)
            return
        try:
            participant = tournament.participants.get(profile=self.user.profile)
        except Participant.DoesNotExist:
            self.accept()
            self.close(CloseCodes.ILLEGAL_CONNECTION)
            logger.warning("Closing because this user is not a participant : %s", self.user)
            return
        if participant.excluded:
            self.accept()
            self.close(CloseCodes.ILLEGAL_CONNECTION)
            logger.warning("Closing because this participant was excluded : %s", self.user)
            return

        async_to_sync(self.channel_layer.group_add)(f"tournament_user_{self.user.id}", self.channel_name)
        async_to_sync(self.channel_layer.group_add)(f"tournament_{self.tournament_id}", self.channel_name)
        self.accept()
        if tournament.status == tournament.ONGOING:
            round_number = tournament.get_current_round_number()
            bracket = tournament.get_user_current_bracket(self.user.profile, round_number)
            if bracket is None:
                logger.warning("This bracket does not exist")
                self.close(CloseCodes.BAD_DATA)
                return
            bracket_status = bracket.status
            if bracket_status in [Bracket.PENDING, Bracket.ONGOING]:
                current_round = tournament.get_current_round(round_number)
                async_to_sync(TournamentWorkerConsumer.receive_start_round_message)(
                    tournament.id,
                    self.user.id,
                    round_number,
                    current_round,
                )

    def disconnect(self, close_code):
        if hasattr(self, "tournament_id") and self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_{self.tournament_id}", self.channel_name)
        if hasattr(self, "user") and self.user:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_user_{self.user.id}", self.channel_name)
        self.close(close_code)

    def receive(self, text_data):
        self.close(CloseCodes.BAD_DATA)

    def close_self_ws(self, event):
        self.tournament_id = None
        self.close(CloseCodes.NORMAL_CLOSURE)

    def tournament_message(self, event):
        try:
            self.send(
                text_data=json.dumps(
                    {
                        "action": event["action"],
                        "data": event["data"],
                    },
                ),
            )
        except RuntimeError as e:
            logger.warning("Failed to send message: %s", e)
