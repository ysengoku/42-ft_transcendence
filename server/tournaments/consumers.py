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

# TODO: see if BracketSchema is really needed
from .schemas import RoundSchema, BracketSchema
from .models import Bracket, Participant, Round, Tournament
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
            self.send_start_round_message(round_number, new_round)

    def disconnect(self, close_code):
        logger.debug("WILL BE DISCONNECTED")
        if self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(f"tournament_{self.tournament_id}", self.channel_name)
        # TODO: See how this line is useful
        async_to_sync(self.channel_layer.group_discard)(f"tournament_user_{self.user.id}", self.channel_name)
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

    def user_left(self, data):
        logger.debug("Bye everyone ! %s", data)
        if Validator.validate_action_data("user_left", data) is False:
            return
        alias = data.get("alias")
        self.send(
            text_data=json.dumps(
                {
                    "action": "registration_canceled",
                    "data": {"alias": alias},
                },
            ),
        )

        # TODO: Find a way to disconnect the user only from the ws
        logger.debug(self.user.username)
        logger.debug(self.user)
        # async_to_sync(self.channel_layer.group_discard)(f"tournament_user_{self.user.id}", self.channel_name)

    def prepare_round(self, event=None):
        logger.debug("function prepare_round")
        try:
            logger.debug(self.tournament_id)
            UUID(str(self.tournament_id))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid.")
            return
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != Tournament.ONGOING:
            logger.warning("Error: the tournament is not ready yet, or already finished")
            logger.warning("Tournament status is : %s", tournament.status)
            return
        round_number = tournament.rounds.filter(status=Round.FINISHED).count() + 1
        logger.debug("round_number is %s", round_number)
        if round_number == 1:
            participants = list(tournament.participants.all())
        else:
            participants = self.take_winners_from(tournament.rounds.get(number=round_number - 1))
        if self.participants_number_is_incorrect(participants):
            self.tournament_canceled()
            return
        if len(participants) == 1:
            logger.debug("Only one participant left")
            self.end_tournament(tournament, participants)
            return
        try:
            new_round = tournament.rounds.get(number=round_number)
        except Round.DoesNotExist:
            logger.warning("This round does not exist, recreating it for the tournament to continue")
            new_round = tournament.rounds.create(number=round_number)
        with transaction.atomic():
            if new_round.status == Round.ONGOING:
                logger.info("This round is already prepared with love <3")
                self.send_start_round_message(round_number, new_round)
                return
            else:
                new_round.status = Round.ONGOING
                new_round.save(update_fields=["status"])
        self.prepare_brackets(participants, round_number, new_round)
        self.send_start_round_message(round_number, new_round)

    def participants_number_is_incorrect(self, participants) -> bool:
        if participants is None:
            logger.warning("Error: last bracket was cancelled or the final winner deleted their profile")
            return True
        num = len(participants)
        if num != 1 and num % 2 != 0:
            logger.warning("Error: a participant deleted their account")
            return True
        return False

    def prepare_brackets(self, participants, round_number, new_round):
        logger.debug("function prepare_brackets")
        logger.debug(new_round)
        bracket_list = self.generate_brackets(participants)
        for p1, p2 in bracket_list:
            new_round.brackets.create(participant1=p1, participant2=p2, status=Bracket.PENDING)
        brackets = new_round.brackets.all()
        logger.debug(brackets.count())
        logger.debug(brackets)
        for bracket in brackets:
            game_room = self.create_tournament_game_room(bracket.participant1, bracket.participant2)
            bracket.game_room = game_room
            bracket.game_id = game_room.id
            bracket.save(update_fields=["game_room", "game_id"])
        logger.debug(new_round)

    def create_tournament_game_room(self, p1, p2):
        gameroom = GameRoom.objects.create(status=GameRoom.ONGOING)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=p1.profile)
        GameRoomPlayer.objects.create(game_room=gameroom, profile=p2.profile)
        return gameroom

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

    def take_winners_from(self, previous_round):
        logger.debug("function take_winners_from")
        winners = []
        for bracket in previous_round.brackets.all():
            logger.debug(bracket)
            if bracket.winner is not None:
                winners.append(bracket.winner)
                logger.debug("winner from bracket : %s", bracket.winner)
        return winners

    def send_start_round_message(self, round_number, new_round):
        logger.debug("function send_start_round_message")
        action = "tournament_start" if round_number == 1 else "round_start"
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        tournament_name = tournament.name
        round_data = RoundSchema.model_validate(new_round)
        logger.debug(round_data)
        # Launch the game
        self.send(
            text_data=json.dumps(
                {
                    "action": action,
                    "data": {
                        "tournament_id": self.tournament_id,
                        "tournament_name": tournament_name,
                        "round": json.loads(round_data.json()),
                    },
                },
            )
        )

    def end_tournament(self, tournament, winner):
        logger.debug("function end_tournament")
        if winner is not None:
            tournament.winner = winner[0]
        tournament.status = Tournament.FINISHED
        tournament.save()

    def tournament_broadcast(self, event):
        logger.debug("function tournament_broadcast")
        self.send(text_data=json.dumps({"action": "new_tournament", "data": event["data"]}))

    def tournament_message(self, event):
        logger.debug("function tournament_message")
        logger.debug("action : %s", event["action"])
        logger.debug("data : %s", event["data"])

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

        if Validator.validate_action_data("new_registration", event["data"]) is False:
            return
        alias = event["data"].get("alias")
        avatar = event["data"].get("avatar")
        self.send_new_registration_to_ws(alias, avatar)

    def send_new_registration_to_ws(self, alias, avatar):
        self.send(
            text_data=json.dumps(
                {
                    "action": "new_registration",
                    "data": {"alias": alias, "avatar": avatar},
                },
            ),
        )

    def self_send_message_to_ws(self, action, data):
        self.send(
            text_data=json.dumps(
                {
                    "action": action,
                    "data": data,
                },
            ),
        )

    def tournament_canceled(self, data=None):
        logger.debug("function tournament_canceled")
        if data is None:
            tournament_id = self.tournament_id
            tournament_name = self.tournament.name
        else:
            tournament_id = data["data"].get("tournament_id")
            tournament_name = data["data"].get("tournament_id")
            if (
                tournament_id is None
                or tournament_name is None
                or not isinstance(tournament_id, str)
                or not isinstance(tournament_id, str)
            ):
                logger.warning("Invalid data for tournament_id or tournament_name")
                return
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament does not exist")
            return
        with transaction.atomic():
            tournament.status = Tournament.CANCELLED
            tournament.save()
        data = {"tournament_id": tournament_id, "tournament_name": tournament_name}
        self.self_send_message_to_ws("tournament_canceled", data)
        self.disconnect(3000)

    def last_registration(self, event):
        logger.debug("function last_registration")
        logger.info(event)
        if Validator.validate_action_data("last_registration", event["data"]) is False:
            return
        alias = event["data"].get("alias")
        avatar = event["data"].get("avatar")
        data = {"alias": alias, "avatar": avatar}
        self.send_new_registration_to_ws(alias, avatar)
        # self.self_send_message_to_ws("tournament_start", data)

    def tournament_game_finished(self, data):
        if Validator.validate_action_data("tournament_game_finished", data) is False:
            return
        try:
            UUID(str(self.tournament_id))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid.")
            return
        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != tournament.ONGOING:
            logger.info("The tournament is not ongoing : it is %s", tournament.status)
            return
        logger.debug("function handle_match_finished")
        logger.debug("data for handle_match_finished : %s", data)
        bracket_id = data.get("bracket_id")
        try:
            bracket = Bracket.objects.get(id=bracket_id, round__tournament=tournament)
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket with this id : %s", bracket_id)
            return
        round = bracket.round

        self.send_match_finished(bracket)
        self.send_match_result(bracket)
        # TODO: Change this to status=Bracket.ONGOING when the game worker will change the Bracket status
        if not Bracket.objects.filter(status=Bracket.PENDING, round__tournament=tournament).exists():
            # only for the sake of testing : The worker should put all brackets to ongoing at the game starting
            # if not Bracket.objects.filter(status=Bracket.ONGOING, round__tournament=tournament).exists():
            round.status = round.FINISHED
            round.save(update_fields=["status"])
            self.self_send_message_to_ws("round_end", data={"tournament_id": str(self.tournament_id)})
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

    def send_match_finished(self, bracket):
        try:
            p1_id = bracket.participant1.profile.user.id
            p2_id = bracket.participant2.profile.user.id
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket with this id : %s", bracket_id)
            return
        data = {
            "type": "tournament_message",
            "action": "match_finished",
            "data": {
                "tournament_id": str(self.tournament_id),
            },
        }
        logger.info("The winner : %s", bracket.winner.profile)
        logger.info("The user : %s", self.user.profile)
        if bracket.winner is None or bracket.winner.profile != self.user.profile:
            loser = self.user.profile
        else:
            loser = None
        for user_id in (p1_id, p2_id):
            async_to_sync(self.channel_layer.group_send)(f"tournament_user_{user_id}", data)
        # This does not self.close the ws for this user
        # TODO: fix this : closing eliminated connexions
        # if loser == self.user.profile:
        #     logger.critical("CLOSING THE CONNECTION FOR THIS LOSER : %s", loser)
        #     self.tournament_id = None
        #     self.close(NORMAL_CLOSURE)

    def send_match_result(self, bracket):
        logger.debug("function send_match_result")
        try:
            round_number = bracket.round.number
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket found with this bracket : %s", bracket)
            return
        bracket_data = BracketSchema.model_validate(bracket)
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament_message",
                "action": "match_result",
                "data": {
                    "tournament_id": str(self.tournament_id),
                    "round_number": round_number,
                    "bracket": json.loads(bracket_data.json()),
                },
            },
        )

    def log_self(self):
        for key, value in self.__dict__.items():
            logger.info("%s: %s", key, value)
