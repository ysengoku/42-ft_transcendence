# server/tournament/consumers.py
import json
import logging
import random
from uuid import UUID
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from django.db import transaction

from pong.models import GameRoom

from .models import Bracket, Participant, Round, Tournament

# TODO: see if BracketSchema is really needed
from .schemas import BracketSchema, RoundSchema

logger = logging.getLogger("server")

# TODO: Verify connexion of both players before the match ?
# TODO: security checks : multiple crash when bad ws id sent by the console
# TODO: put all shared macros between files in the same file
NORMAL_CLOSURE = 3000
CANCELLED = 3001
ILLEGAL_CONNECTION = 3002
ALREADY_IN_GAME = 3003
BAD_DATA = 3100


from channels.layers import get_channel_layer


class TournamentService:
    @staticmethod
    def send_group_message(tournament_id, action, data=None):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"tournament_{tournament_id}",
            {
                "type": "tournament_message",
                "action": action,
                "data": data,
            },
        )

    @staticmethod
    def send_personal_message(user_id, action, data=None):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"tournament_user_{user_id}",
            {
                "type": "tournament_message",
                "action": action,
                "data": data,
            },
        )

    @staticmethod
    def trigger_action(tournament_id, the_type, data=None):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"tournament_{tournament_id}",
            {
                "type": the_type,
                "data": data,
            },
        )

    @staticmethod
    def prepare_round(tournament_id, event=None):
        logger.debug("function prepare_round")
        try:
            logger.debug(tournament_id)
            UUID(str(tournament_id))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid.")
            return
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != Tournament.ONGOING:
            logger.warning("Error: the tournament is not ready yet, or already finished")
            logger.warning("Tournament status is : %s", tournament.status)
            return
        round_number = tournament.get_current_round_number()
        logger.debug("round_number is %s", round_number)
        if round_number == 1:
            participants = list(tournament.participants.all())
        else:
            participants = TournamentService.take_winners_from(tournament.rounds.get(number=round_number - 1))
        if TournamentService.participants_number_is_incorrect(participants):
            TournamentService.tournament_canceled(tournament_id)
            return
        if len(participants) == 1:
            logger.debug("Only one participant left")
            TournamentService.end_tournament(tournament, participants)
            return
        new_round = tournament.get_current_round(round_number)
        with transaction.atomic():
            if new_round.status == Round.ONGOING:
                logger.info("This round is already prepared with love <3")
                TournamentService.send_start_round_message(tournament_id, round_number, new_round)
                return
            new_round.status = Round.ONGOING
            new_round.save(update_fields=["status"])
        TournamentService.prepare_brackets(participants, round_number, new_round)
        TournamentService.send_start_round_message(tournament_id, round_number, new_round)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.send)(
            "tournament_worker",
            {
                "type": "check_brackets_later",
                "tournament_id": str(tournament_id),
            },
        )

    @staticmethod
    @database_sync_to_async
    def async_check_brackets_status(tournament_id):
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        current_round = tournament.get_current_round()
        if tournament.status != tournament.FINISHED and current_round.brackets.filter(status=Bracket.PENDING).exists():
            TournamentService.tournament_canceled(tournament)

    @staticmethod
    def participants_number_is_incorrect(participants) -> bool:
        if participants is None or len(participants) == 0:
            logger.warning("Error: last bracket was cancelled or the final winner deleted their profile")
            return True
        num = len(participants)
        if num != 1 and num % 2 != 0:
            logger.warning("Error: a participant deleted their account")
            return True
        return False

    @staticmethod
    def prepare_brackets(participants, round_number, new_round):
        logger.debug("function prepare_brackets")
        logger.debug(new_round)
        bracket_list = TournamentService.generate_brackets(participants)
        for p1, p2 in bracket_list:
            new_round.brackets.create(participant1=p1, participant2=p2, status=Bracket.PENDING)
        brackets = new_round.brackets.all()
        logger.debug(brackets.count())
        logger.debug(brackets)
        for bracket in brackets:
            game_room = TournamentService.create_tournament_game_room(bracket.participant1, bracket.participant2)
            bracket.game_room = game_room
            bracket.game_id = game_room.id
            bracket.save(update_fields=["game_room", "game_id"])
        logger.debug(new_round)

    @staticmethod
    def create_tournament_game_room(p1, p2):
        gameroom: GameRoom = GameRoom.objects.create(status=GameRoom.ONGOING)
        gameroom.add_player(p1.profile)
        gameroom.add_player(p2.profile)
        return gameroom

    @staticmethod
    def generate_brackets(participants):
        logger.debug("function generate_brackets")
        participants = list(participants)
        random.shuffle(participants)
        brackets = []
        while len(participants) >= 2:
            p1 = participants.pop()
            p2 = participants.pop()
            brackets.append((p1, p2))
        return brackets

    @staticmethod
    def take_winners_from(previous_round):
        logger.debug("function take_winners_from")
        winners = []
        for bracket in previous_round.brackets.all():
            logger.debug(bracket)
            if bracket.winner is not None:
                winners.append(bracket.winner)
                logger.debug("winner from bracket : %s", bracket.winner)
        return winners

    @staticmethod
    def send_start_round_message(tournament_id, round_number, new_round):
        logger.debug("function send_start_round_message, round : %s", round_number)
        action = "tournament_start" if round_number == 1 else "round_start"
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        tournament_name = tournament.name
        round_data = RoundSchema.model_validate(new_round)
        logger.debug(round_data)
        # Launch the game
        TournamentService.send_group_message(
            tournament_id,
            action,
            data={
                "tournament_id": str(tournament_id),
                "tournament_name": tournament_name,
                "round": json.loads(round_data.json()),
            },
        )

    @staticmethod
    def receive_start_round_message(tournament_id, user_id, round_number, new_round):
        logger.debug("function receive_start_round_message, round number : %s", round_number)
        action = "tournament_start" if round_number == 1 else "round_start"
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        tournament_name = tournament.name
        round_data = RoundSchema.model_validate(new_round)
        logger.debug(round_data)
        # Launch the game
        TournamentService.send_personal_message(
            user_id,
            action,
            data={
                "tournament_id": str(tournament_id),
                "tournament_name": tournament_name,
                "round": json.loads(round_data.json()),
            },
        )

    @staticmethod
    def end_tournament(tournament, winner):
        logger.debug("function end_tournament")
        if winner is not None:
            tournament.winner = winner[0]
            winner[0].status = Participant.WINNER
            winner[0].save(update_fields=["status"])
            tournament.status = Tournament.FINISHED
            logger.debug("Tournament should be set to FINISHED with a winner")
        else:
            tournament.status = Tournament.CANCELLED
            logger.debug("Tournament should be cancelled")
        tournament.save()
        logger.debug("Tournament status : %s", tournament.status)
        participants = tournament.participants.all()
        for p in participants:
            p.profile.user.tournament_id = None
        TournamentService.trigger_action(tournament.id, "close_self_ws")

    @staticmethod
    def new_registration(tournament_id, alias, avatar, is_last):
        logger.debug("function new_registration")
        data = {"alias": alias, "avatar": avatar}
        TournamentService.send_group_message(tournament_id, "new_registration", data)
        if is_last:
            TournamentService.send_group_message(tournament_id, "tournament_start", data)

    @staticmethod
    def tournament_canceled(tournament_id, data=None):
        logger.debug("function tournament_canceled")
        try:
            tournament = Tournament.objects.get(id=tournament_id)
            tournament_name = tournament.name
        except Tournament.DoesNotExist:
            logger.warning("This tournament does not exist")
            return
        with transaction.atomic():
            tournament.status = Tournament.CANCELLED
            tournament.save(update_fields=["status"])
        data = {"tournament_id": str(tournament_id), "tournament_name": tournament_name}
        TournamentService.send_group_message(tournament_id, "tournament_canceled", data)
        participants = tournament.participants.all()
        for p in participants:
            p.profile.user.tournament_id = None
        TournamentService.trigger_action(tournament_id, "close_self_ws")

    @staticmethod
    def tournament_game_finished(tournament_id, bracket_id):
        try:
            UUID(str(tournament_id))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid.")
            return
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != tournament.ONGOING:
            logger.info("The tournament is not ongoing : it is %s", tournament.status)
            return
        logger.debug("function handle_match_finished")
        logger.debug("data for handle_match_finished : %s", bracket_id)
        try:
            bracket = Bracket.objects.get(id=bracket_id, round__tournament=tournament)
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket with this id : %s", bracket_id)
            return

        TournamentService.send_match_finished(tournament_id, bracket)
        TournamentService.send_match_result(tournament_id, bracket)

        round = bracket.round
        if not Bracket.objects.filter(
            status__in=[Bracket.ONGOING, Bracket.PENDING],
            round__tournament=tournament,
        ).exists():
            round.status = Round.FINISHED
            round.save(update_fields=["status"])
            data = {"tournament_id": str(tournament_id)}
            TournamentService.send_group_message(tournament_id, "round_end", data)
            TournamentService.prepare_round(tournament_id)
        else:
            brackets_left = Bracket.objects.filter(
                status__in=[Bracket.ONGOING, Bracket.PENDING],
                round__tournament=tournament,
            )
            for b in brackets_left:
                logger.debug("Left brackets : %s", b)

    @staticmethod
    # TODO: See how to handle this self
    def send_match_finished(tournament_id, bracket):
        try:
            p1_id = bracket.participant1.profile.user.id
            p2_id = bracket.participant2.profile.user.id
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket with this id : %s", bracket.id)
            return
        logger.info("The winner from this bracket : %s", bracket.winner)
        data = {"tournament_id": str(tournament_id)}
        TournamentService.send_personal_message(p1_id, "match_finished", data)
        TournamentService.send_personal_message(p2_id, "match_finished", data)
        if bracket.winner is None:
            TournamentService.disconnect_user(p1_id)
            TournamentService.disconnect_user(p2_id)
        elif bracket.winner == bracket.participant1.profile:
            TournamentService.disconnect_user(p2_id)
        else:
            TournamentService.disconnect_user(p2_id)

    @staticmethod
    def send_match_result(tournament_id, bracket):
        logger.debug("function send_match_result")
        try:
            round_number = bracket.round.number
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket found with this bracket : %s", bracket)
            return
        bracket_data = BracketSchema.model_validate(bracket)
        data = {
            "tournament_id": str(tournament_id),
            "round_number": round_number,
            "bracket": json.loads(bracket_data.json()),
        }
        TournamentService.send_group_message(tournament_id, "match_result", data)

    @staticmethod
    def disconnect_user(user_id):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"tournament_user_{user_id}",
            {
                "type": "close_self_ws",
            },
        )

    @staticmethod
    def user_left(tournament_id, alias, user_id):
        data = {"alias": alias}
        TournamentService.disconnect_user(user_id)
        TournamentService.send_group_message(tournament_id, "registration_canceled", data)
