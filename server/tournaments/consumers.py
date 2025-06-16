# server/tournament/consumers.py
import json
import logging
import uuid
import random

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Bracket, Participant, Round, Tournament
from .tournament_validator import Validator

logger = logging.getLogger("server")


class TournamentConsumer(WebsocketConsumer):
    tournaments = {}

    def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            logger.warning("TournamentConsumer : Unauthentificated user trying to connect")
            self.close()
            return
        self.tournament_id = self.scope["url_route"]["kwargs"].get("tournament_id")

        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %S", tournament_id)
            self.close()
        async_to_sync(self.channel_layer.group_add)(f"tournament_{self.tournament_id}", self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        if self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_{self.tournament_id}", self.channel_name)
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {"type": "tournament.broadcast", "action": "user_left", "data": {"user": self.user.username}},
        )
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
            case "last_registration":
                self.start_round(data)
            case "start_round":
                self.start_round(data)
            case "match_result":
                self.handle_match_result(data)
            case _:
                logger.debug("Tournament unknown action : %s", action)

    def user_left(self, data):
        """
        TODO: verify if this function really needs to exist
        When the participant cancels their own participation, it sends user_left
        """
        logger.debug("Bye everyone ! %s", data)
        alias = data.get("alias")
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "registration_canceled",
                "data": {"alias": alias},
            },
        )

    def start_round(self, data):
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        round_number = tournament.rounds.count() + 1
        new_round = tournament.rounds.create(number=round_number)
        if round_number == 1:
            participants = list(tournament.participants.all())
        else:
            participants = self.take_winners_from(tournament.rounds.get(round_number - 1))
        if participants is None:
            logger.warning("It seems that the last tournament bracket was cancelled")
            return
        # else if participants == 1 === WINNER TOURNAMENT
        brackets = self.generate_brackets(participants)

        for p1, p2 in brackets:
            Bracket.objects.create(round=new_round, participant1=p1, participant2=p2, status=Bracket.PENDING)
        # Launch the game
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "start_game",
                "data": {"round_number": round_number, "brackets": brackets},
            },
        )

    def take_winners_from(self, previous_round):
        winners = []
        for bracket in previous_round.brackets.all():
            if bracket.winner is not None:
                winners.append(bracket.winner)
        return winners

    def tournament_broadcast(self, event):
        logger.debug("function tournament_broadcast")
        self.send(text_data=json.dumps({"action": "new_tournament", "data": event["data"]}))

    def tournament_message(self, event):
        logger.debug("function tournament_message")
        self.send(
            text_data=json.dumps(
                {
                    "action": event["action"],
                    "data": event["data"],
                }
            )
        )

    def new_registration(self, event):
        logger.debug("function new_registration")
        logger.info(event)
        alias = event["data"].get("alias")
        avatar = event["data"].get("avatar")
        # if Validator.validate_action_data("new_registration", event) is False:
        #     self.close() # Closes the tournament ???
        self.send_new_registration_to_ws(alias, avatar)

    def send_new_registration_to_ws(self, alias, avatar):
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "new_registration",
                "data": {"alias": alias, "avatar": avatar},
            },
        )

    def last_registration(self, event):
        logger.debug("function last_registration")
        logger.info(event)
        alias = event["data"].get("alias")
        avatar = event["data"].get("avatar")
        # if (Validator.validate_action_data("last_registration", event) == False):
        #     self.close() # Closes the tournament ???
        self.send_new_registration_to_ws(alias, avatar)
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "tournament_start",
                "data": {"alias": alias, "avatar": avatar},
            },
        )

    def generate_brackets(self, participants):
        logger.debug("function generate_brackets")
        participants = list(participants)
        random.shuffle(participants)
        brackets = []
        while len(participants) >= 2:
            p1 = participants.pop()
            p2 = participants.pop()
            brackets.append((p1, p2))
        return brackets
