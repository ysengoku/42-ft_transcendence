# server/tournament/consumers.py
import json
import logging
import random
import uuid

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.exceptions import ValidationError
from django.db import transaction

from pong.models import GameRoom, GameRoomPlayer

from .models import Bracket, Participant, Round, Tournament
from .tournament_validator import Validator

logger = logging.getLogger("server")

# TODO: Implement round_end
# TODO: Verify connexion of both players before the match


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
                self.prepare_round(data)
            case "start_round":
                self.prepare_round(data)
            case "round_end":
                self.prepare_round(data)
            case "tournament_game_finished":
                self.handle_match_finished(data)
            case _:
                logger.debug("Tournament unknown action : %s", action)

    def user_left(self, data):
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

    def prepare_round(self, data):
        logger.debug("function prepare_round")
        logger.debug("data for prepare_round : %s", data)
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        round_number = tournament.rounds.filter(status=Round.FINISHED).count() + 1
        new_round = tournament.rounds.get(number=round_number)
        if round_number == 1:
            participants = list(tournament.participants.all())
        else:
            participants = self.take_winners_from(tournament.rounds.get(number=round_number - 1))
        if participants is None:
            logger.warning("It seems that the last tournament bracket was cancelled")
            self.cancel_tournament()
            return
        if participants.count() == 1:
            self.end_tournament()
            return
        brackets = self.generate_brackets(participants)

        for p1, p2 in brackets:
            new_round.brackets.create(participant1=p1, participant2=p2, status=Bracket.PENDING)
        self.prepare_game_rooms_in_brackets(round_number, new_round)
        self.send_start_round_message(round_number, new_round)

    def prepare_game_rooms_in_brackets(self, round_number, new_round):
        brackets = new_round.brackets.all()
        for bracket in brackets:
            game_room = self.create_tournament_game_room(bracket.participant1, bracket.participant2)
            bracket.status = Bracket.ONGOING
            bracket.game_room = game_room
            bracket.save()

    def create_tournament_game_room(self, p1, p2):
        gameroom = GameRoom.objects.create(status=GameRoom.ONGOING)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=p1.profile)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=p2.profile)
        return gameroom

    def send_start_round_message(self, round_number, new_round):
        action = "tournament_start" if round_number == 1 else "round_start"
        # Launch the game
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": action,
                "data": {
                    "tournament_id": self.tournament_id,
                    "tournament_name": self.tournament_name,
                    "round": new_round,
                },
            },
        )

    def end_tournament(self):
        self.tournament.status = Tournament.FINISHED
        self.tournament.save()

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
                },
            ),
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

    def send_tournament_canceled_to_ws(self):
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "tournament_canceled",
                "data": {
                    "tournament_id": str(self.tournament_id),
                    "tournament_name": self.tournament_name,
                },
            },
        )

    def cancel_tournament(self):
        with transaction.atomic():
            self.tournament.status = Tournament.CANCELLED
            self.tournament.save()
        self.send_tournament_canceled_to_ws()

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

    def handle_match_finished(self, data):
        logger.debug("function handle_match_finished")
        logger.debug("data for handle_match_finished : %s", data)
        bracket_id = data["data"].get("id")
        bracket = self.tournament.round.bracket(id=bracket_id)
        round = bracket.round

        self.send_match_result(bracket)
        self.send_match_finished()
        if self.bracket.filter(status=Bracket.ONGOING) == 0:
            round.status = round.FINISHED
            round.save()
            # self.tournament.round.get(number=round_number).status = round.FINISHED
            # self.tournament.round.save()
            self.send_round_end_to_ws()
            self.prepare_round()

    def send_round_end_to_ws(self):
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "round_end",
                "data": {
                    "tournament_id": str(self.tournament_id),
                },
            },
        )

    def send_match_finished(self):
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "match_finished",
                "data": {
                    "tournament_id": str(self.tournament_id),
                },
            },
        )

    def send_match_result(
        self,
    ):
        logger.debug("function send_match_result")
        round_number = bracket.round.number
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "match_result",
                "data": {
                    "tournament_id": str(self.tournament_id),
                    "round_number": round_number,
                    "bracket": bracket,
                },
            },
        )
