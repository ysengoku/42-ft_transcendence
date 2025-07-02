# server/tournament/consumers.py
import json
import logging
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from .models import Bracket, Tournament

# TODO: see if BracketSchema is really needed
from .tournament_service import TournamentService
from .tournament_validator import Validator

logger = logging.getLogger("server")

# TODO: Verify connexion of both players before the match ?
# TODO: security checks : multiple crash when bad ws id sent by the console
# TODO: put all shared macros between files in the same file
NORMAL_CLOSURE = 3000
CANCELLED = 3001
ILLEGAL_CONNECTION = 3002
ALREADY_IN_GAME = 3003
BAD_DATA = 3100


class TournamentConsumer(WebsocketConsumer):
    tournaments = {}

    def connect(self):
        self.user = self.scope.get("user")
        logger.debug("CONNECTING %s TO TOURNAMENT SOCKET", self.user)
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
            self.close(ILLEGAL_CONNECTION)
            return

        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %s", self.tournament_id)
            self.accept()  # TODO: test this
            self.close(BAD_DATA)
            return
        if not tournament.has_participant(self.user.profile):
            logger.warning("This user is not a participant: %s", self.user)
            self.accept()
            logger.warning("CLOSING BECAUSE NOT A PARTICIPANT")
            self.close(ILLEGAL_CONNECTION)
            return

        async_to_sync(self.channel_layer.group_add)(f"tournament_user_{self.user.id}", self.channel_name)
        async_to_sync(self.channel_layer.group_add)(f"tournament_{self.tournament_id}", self.channel_name)
        logger.debug("WILL BE ACCEPTED : %s", self.user)
        self.accept()
        if tournament.status == tournament.ONGOING:
            round_number = tournament.get_current_round_number()
            bracket_status = tournament.get_user_current_bracket(self.user.profile, round_number).status
            if bracket_status in [Bracket.PENDING, Bracket.ONGOING]:
                current_round = tournament.get_current_round(round_number)
                TournamentService.receive_start_round_message(tournament.id, self.user.id, round_number, current_round)

    def disconnect(self, close_code):
        logger.debug("WILL BE DISCONNECTED : %s", self.user)
        if hasattr(self, "tournament_id") and self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_{self.tournament_id}", self.channel_name)
        # TODO: See how the line about the tournament user is useful
        if hasattr(self, "user") and self.user:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_user_{self.user.id}", self.channel_name)
        logger.warning("CLOSING FROM DISCONNECT")
        # self.close(close_code)
        self.close(close_code)

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get("action")

        if not action:
            logger.warning("Tournament: Message without action received")
            return

        entire_data = text_data_json.get("data", {})
        if not Validator.validate_action_data(action, entire_data):
            return

        match action:
            case _:
                logger.debug("Tournament unknown action : %s", action)
                self.close()

    def close_self_ws(self, event):
        self.tournament_id = None
        logger.warning("CLOSING WITH CLOSE SELF WS")
        self.close(NORMAL_CLOSURE)

    def tournament_broadcast(self, event):
        logger.debug("function tournament_broadcast")
        self.send(text_data=json.dumps({"action": "new_tournament", "data": event["data"]}))

    def tournament_message(self, event):
        logger.debug("function tournament_message")
        logger.debug("action : %s", event["action"])
        logger.debug("data : %s", event["data"])
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
