# server/tournament/consumers.py
import json
import logging
import random
import uuid
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.exceptions import ValidationError
from django.db import transaction

from pong.models import GameRoom, GameRoomPlayer

from .models import Bracket, Participant, Round, Tournament

# TODO: see if BracketSchema is really needed
from .schemas import BracketSchema, RoundSchema
from .tournament_validator import Validator
from .tournament_service import TournamentService

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
        logger.debug("CONNECTING %s", self.user)
        if not self.user or not self.user.is_authenticated:
            logger.warning("TournamentConsumer : Unauthentificated user trying to connect")
            self.close()
            return
        logger.debug("STILL CONNECTED %s", self.user)
        self.tournament_id = self.scope["url_route"]["kwargs"].get("tournament_id")
        try:
            UUID(str(self.tournament_id))
        except:
            logger.warning("Wrong uuid : %s", self.tournament_id)
            self.accept()
            self.close(ILLEGAL_CONNECTION)
            return

        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %s", self.tournament_id)
            self.close()
            return
        if not tournament.participants.filter(profile=self.user.profile).exists():
            logger.warning("This user is not a participant: %s", self.user)
            self.accept()
            self.close(ILLEGAL_CONNECTION)
            return

        async_to_sync(self.channel_layer.group_add)(f"tournament_user_{self.user.id}", self.channel_name)
        async_to_sync(self.channel_layer.group_add)(f"tournament_{self.tournament_id}", self.channel_name)
        logger.debug("WILL BE ACCEPTED %s", self.user)
        self.accept()
        if tournament.status == Tournament.ONGOING:
            logger.debug("THIS TOURNAMENT IS UNGOINGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
            round_number = tournament.rounds.filter(status=Round.FINISHED).count() + 1
            try:
                new_round = tournament.rounds.get(number=round_number)
            except Round.DoesNotExist:
                logger.warning("This round should exist")
                return
            if round_number == 1: # and no brackets has began
                TournamentService.send_start_round_message(tournament.id, round_number, new_round)
            else:
                TournamentService.receive_start_round_message(tournament.id, self.user.id, round_number, new_round)

    def disconnect(self, close_code):
        logger.debug("WILL BE DISCONNECTED")
        if self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_{self.tournament_id}", self.channel_name)
        # TODO: See how this line is useful
        async_to_sync(self.channel_layer.group_discard)(f"tournament_user_{self.user.id}", self.channel_name)
        self.close(close_code)
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %s", self.tournament_id)
            return
        if tournament.status == Tournament.ONGOING: 
            logger.debug("THIS TOURNAMENT IS UNGOINGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
            round_number = tournament.rounds.filter(status=Round.FINISHED).count() + 1
            try:
                new_round = tournament.rounds.get(number=round_number)
            except Round.DoesNotExist:
                logger.warning("This round should exist")
                return
            if round_number == 1: # and no brackets has began
                TournamentService.send_start_round_message(tournament.id, round_number, new_round)

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
        except Disconnected as e:
            logger.warning("Failed to send message : %s", e)


    def tournament_game_finished(self, data):
        if Validator.validate_action_data("tournament_game_finished", data) is False:
            return
        TournamentService.tournament_game_finished(self.tournament_id, data)
        return
