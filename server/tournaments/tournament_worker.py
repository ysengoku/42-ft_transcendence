import asyncio
import json
import logging
import random
from uuid import UUID

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer
from django.db import transaction

from pong.models import GameRoom

from .models import Bracket, Participant, Round, Tournament
from .schemas import BracketSchema, RoundSchema

logger = logging.getLogger("server")


class TournamentWorkerConsumer(AsyncConsumer):
    @staticmethod
    async def check_brackets_later_task(tournament_id, round_number):
        if tournament_id is None or round_number is None:
            return
        time_to_wait = 30
        await asyncio.sleep(time_to_wait)
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        current_round = await database_sync_to_async(lambda: tournament.get_current_round(round_number))()
        has_pending_brackets = await database_sync_to_async(
            lambda: current_round.brackets.filter(status=Bracket.PENDING).exists(),
        )()
        if tournament.status != tournament.FINISHED and has_pending_brackets:
            has_ongoing_or_finished_brackets = await database_sync_to_async(
                lambda: current_round.brackets.filter(status__in=[Bracket.ONGOING, Bracket.FINISHED]).exists(),
            )()
            if has_ongoing_or_finished_brackets:
                logger.info("Players didn't join in time : cancelling bracket(s)")
                brackets_to_cancel = await database_sync_to_async(
                    lambda: list(current_round.brackets.filter(status=Bracket.PENDING)),
                )()
                for b in brackets_to_cancel:
                    await TournamentWorkerConsumer.cancel_bracket(b, tournament_id)
                has_ongoing_brackets = await database_sync_to_async(
                    lambda: current_round.brackets.filter(status=Bracket.ONGOING).exists(),
                )()
                if not has_ongoing_brackets:
                    await TournamentWorkerConsumer.set_round_finished(current_round)
                    await TournamentWorkerConsumer.prepare_round(tournament_id)
            else:
                logger.info("No player connected to tournament games : cancelling tournament")
                await TournamentWorkerConsumer.tournament_canceled(tournament_id)

    @staticmethod
    async def send_group_message(tournament_id, action, data=None):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"tournament_{tournament_id}",
            {
                "type": "tournament_message",
                "action": action,
                "data": data,
            },
        )

    @staticmethod
    async def send_personal_message(user_id, action, data=None):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"tournament_user_{user_id}",
            {
                "type": "tournament_message",
                "action": action,
                "data": data,
            },
        )

    @staticmethod
    async def trigger_action(tournament_id, the_type, data=None):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"tournament_{tournament_id}",
            {
                "type": the_type,
                "data": data,
            },
        )

    @database_sync_to_async
    def set_round_ongoing(self, new_round):
        with transaction.atomic():
            if new_round.status == Round.ONGOING:
                return True
            new_round.status = Round.ONGOING
            new_round.save(update_fields=["status"])
            return False

    @database_sync_to_async
    def set_round_finished(self, current_round):
        with transaction.atomic():
            current_round.status = Round.FINISHED
            current_round.save(update_fields=["status"])

    @staticmethod
    async def prepare_round(tournament_id, event=None):
        try:
            UUID(str(tournament_id))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid.")
            return
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != Tournament.ONGOING:
            logger.warning("Error: the tournament is not in a playing state. Status is : %s", tournament.status)
            return
        round_number = await database_sync_to_async(lambda: tournament.get_current_round_number())()
        if round_number == 1:
            participants = await database_sync_to_async(lambda: list(tournament.participants.all()))()
        else:
            prev_round = await database_sync_to_async(lambda: tournament.rounds.get(number=round_number - 1))()
            participants = await TournamentWorkerConsumer.take_winners_from(prev_round)
        if TournamentWorkerConsumer.participants_number_is_incorrect(participants):
            await TournamentWorkerConsumer.tournament_canceled(tournament_id)
            return
        if len(participants) == 1:
            await TournamentWorkerConsumer.end_tournament(tournament, participants)
            return
        new_round = await database_sync_to_async(lambda: tournament.get_current_round(round_number))()
        round_already_prepared = await TournamentWorkerConsumer.set_round_ongoing(new_round)
        if round_already_prepared:
            await TournamentWorkerConsumer.send_start_round_message(tournament_id, round_number, new_round)
            return
        await TournamentWorkerConsumer.prepare_brackets(participants, round_number, new_round, tournament.settings)
        await TournamentWorkerConsumer.send_start_round_message(tournament_id, round_number, new_round)
        finished_brackets = await database_sync_to_async(
            lambda: list(new_round.brackets.filter(status=Bracket.FINISHED)),
        )()
        for b in finished_brackets:
            await TournamentWorkerConsumer.tournament_game_finished_worker(tournament_id, b.id)
        asyncio.create_task(TournamentWorkerConsumer.check_brackets_later_task(tournament_id, round_number))

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

    @database_sync_to_async
    def prepare_brackets(self, participants, round_number, new_round, settings):
        bracket_list = TournamentWorkerConsumer.generate_brackets(participants)
        for p1, p2 in bracket_list:
            new_round.brackets.create(participant1=p1, participant2=p2, status=Bracket.PENDING)
        brackets = new_round.brackets.all()
        for bracket in brackets:
            game_room = TournamentWorkerConsumer.create_tournament_game_room(
                bracket.participant1,
                bracket.participant2,
                settings,
            )
            bracket.game_room = game_room
            bracket.game_id = game_room.id
            bracket.save(update_fields=["game_room", "game_id"])
            if game_room.status == GameRoom.CLOSED:
                bracket.status = Bracket.FINISHED
                bracket.winner = bracket.participant1 if bracket.participant2.excluded else bracket.participant2
                bracket.save(update_fields=["status", "winner"])

    def create_tournament_game_room(self, p2, settings):
        gameroom: GameRoom = GameRoom.objects.create(status=GameRoom.ONGOING)
        gameroom.add_player(self.profile)
        gameroom.add_player(p2.profile)
        gameroom.settings = settings
        gameroom.save(update_fields=["settings"])
        if self.excluded or p2.excluded:
            gameroom.status = GameRoom.CLOSED
            gameroom.save(update_fields=["status"])
        return gameroom

    @staticmethod
    def generate_brackets(participants):
        participants = list(participants)
        random.shuffle(participants)
        brackets = []
        while participants:
            p1 = participants.pop()
            p2 = participants.pop()
            brackets.append((p1, p2))
        return brackets

    @database_sync_to_async
    def take_winners_from(self, previous_round):
        winners = []
        for bracket in previous_round.brackets.all():
            bracket_winner = bracket.get_winner()
            if bracket_winner is not None:
                winners.append(bracket_winner)
        return winners

    @staticmethod
    @database_sync_to_async
    def serialize_round_for_schema(new_round):
        return RoundSchema.model_validate(new_round)

    @staticmethod
    @database_sync_to_async
    def serialize_bracket_for_schema(bracket):
        return BracketSchema.model_validate(bracket)

    @staticmethod
    async def send_start_round_message(tournament_id, round_number, new_round):
        action = "tournament_start" if round_number == 1 else "round_start"
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        tournament_name = tournament.name
        round_data = await TournamentWorkerConsumer.serialize_round_for_schema(new_round)
        # Launch the game
        await TournamentWorkerConsumer.send_group_message(
            tournament_id,
            action,
            data={
                "tournament_id": str(tournament_id),
                "tournament_name": tournament_name,
                "round": json.loads(round_data.json()),
            },
        )

    @staticmethod
    async def receive_start_round_message(tournament_id, user_id, round_number, new_round):
        action = "tournament_start" if round_number == 1 else "round_start"
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        tournament_name = tournament.name
        round_data = await TournamentWorkerConsumer.serialize_round_for_schema(new_round)
        # Launch the game
        await TournamentWorkerConsumer.send_personal_message(
            user_id,
            action,
            data={
                "tournament_id": str(tournament_id),
                "tournament_name": tournament_name,
                "round": json.loads(round_data.json()),
            },
        )

    @database_sync_to_async
    def apply_end_tournament_state(self, tournament, winner):
        if winner is not None:
            tournament.winner = winner[0]
            winner[0].status = Participant.WINNER
            winner[0].save(update_fields=["status"])
            tournament.status = Tournament.FINISHED
        else:
            tournament.status = Tournament.CANCELLED
        tournament.save()

    @staticmethod
    async def end_tournament(tournament, winner):
        await TournamentWorkerConsumer.apply_end_tournament_state(tournament, winner)
        await TournamentWorkerConsumer.trigger_action(tournament.id, "close_self_ws")

    @staticmethod
    async def new_registration(tournament_id, alias, avatar, is_last):
        data = {"alias": alias, "avatar": avatar}
        await TournamentWorkerConsumer.send_group_message(tournament_id, "new_registration", data)
        if is_last:
            await TournamentWorkerConsumer.send_group_message(tournament_id, "tournament_start", data)

    @database_sync_to_async
    def cancel_tournament_transaction(self, tournament):
        with transaction.atomic():
            tournament.status = Tournament.CANCELLED
            tournament.save(update_fields=["status"])

    @staticmethod
    async def tournament_canceled(tournament_id, data=None):
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
            tournament_name = tournament.name
        except Tournament.DoesNotExist:
            logger.warning("This tournament does not exist")
            return
        await TournamentWorkerConsumer.cancel_tournament_transaction(tournament)
        data = {"tournament_id": str(tournament_id), "tournament_name": tournament_name}
        await TournamentWorkerConsumer.send_group_message(tournament_id, "tournament_canceled", data)

    @database_sync_to_async
    def perform_cancel_bracket(self, bracket):
        with transaction.atomic():
            bracket.winner = bracket.participant1
            bracket.status = Bracket.CANCELLED
            bracket.participant1.status = Participant.QUALIFIED
            bracket.participant2.status = Participant.ELIMINATED
            bracket.participant1.excluded = True
            bracket.participant2.excluded = True
            bracket.participant1.save(update_fields=["excluded", "status"])
            bracket.participant2.save(update_fields=["excluded", "status"])
            bracket.save(update_fields=["status", "winner"])
            gameroom = GameRoom.objects.get(id=bracket.game_id)
            gameroom.set_closed()
        p1_id = bracket.participant1.profile.user.id
        p2_id = bracket.participant2.profile.user.id
        return p1_id, p2_id

    @staticmethod
    async def cancel_bracket(bracket, tournament_id):
        p1_id, p2_id = await TournamentWorkerConsumer.perform_cancel_bracket(bracket)
        await TournamentWorkerConsumer.disconnect_user(p1_id)
        await TournamentWorkerConsumer.disconnect_user(p2_id)

    async def tournament_game_finished(self, event):
        if event is None or "tournament_id" not in event or "bracket_id" not in event:
            return
        await TournamentWorkerConsumer.tournament_game_finished_worker(event["tournament_id"], event["bracket_id"])

    async def tournament_game_finished_worker(self, bracket_id):
        try:
            UUID(str(self))
        except ValueError:
            logger.warning("this tournament id is not a valid uuid : %s", self)
            return
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=self)
        except Tournament.DoesNotExist:
            logger.warning("This tournament doesn't exist.")
            return
        if tournament.status != tournament.ONGOING:
            logger.info("The tournament is not ongoing : it is %s", tournament.status)
            return
        try:
            bracket = await database_sync_to_async(Bracket.objects.get)(id=bracket_id, round__tournament=tournament)
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket with this id : %s", bracket_id)
            return

        await TournamentWorkerConsumer.disconnect_losers(self, bracket)
        await TournamentWorkerConsumer.send_match_result(self, bracket)

        last_round = bracket.round
        has_ongoing_or_pending_bracket = await database_sync_to_async(
            lambda: Bracket.objects.filter(
                status__in=[Bracket.ONGOING, Bracket.PENDING],
                round__tournament=tournament,
            ).exists(),
        )()
        if not has_ongoing_or_pending_bracket:
            logger.info("Round finished for tournament : %s", tournament.name)
            last_round.status = Round.FINISHED
            await database_sync_to_async(last_round.save)(update_fields=["status"])
            data = {"tournament_id": str(self)}
            await TournamentWorkerConsumer.send_group_message(self, "round_end", data)
            await TournamentWorkerConsumer.prepare_round(self)

    @staticmethod
    @database_sync_to_async
    def get_participant_user_ids(bracket):
        return (
            bracket.participant1.profile.user.id,
            bracket.participant2.profile.user.id,
        )

    @staticmethod
    async def disconnect_losers(tournament_id, bracket):
        p1_id, p2_id = await TournamentWorkerConsumer.get_participant_user_ids(bracket)
        {"tournament_id": str(tournament_id)}
        bracket_winner = await database_sync_to_async(lambda: bracket.get_winner())()
        if bracket_winner is None:
            await asyncio.gather(
                TournamentWorkerConsumer.disconnect_user(p1_id),
                TournamentWorkerConsumer.disconnect_user(p2_id),
            )
        elif bracket.winner == bracket.participant1.profile:
            await TournamentWorkerConsumer.disconnect_user(p2_id)
        else:
            await TournamentWorkerConsumer.disconnect_user(p2_id)

    @staticmethod
    async def send_match_result(tournament_id, bracket):
        try:
            round_number = await database_sync_to_async(lambda: bracket.round.number)()
        except Bracket.DoesNotExist:
            logger.warning("Error: No bracket found with this bracket : %s", bracket)
            return
        bracket_data = await TournamentWorkerConsumer.serialize_bracket_for_schema(bracket)
        data = {
            "tournament_id": str(tournament_id),
            "round_number": round_number,
            "bracket": json.loads(bracket_data.json()),
        }
        await TournamentWorkerConsumer.send_group_message(tournament_id, "match_result", data)

    @staticmethod
    async def disconnect_user(user_id):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"tournament_user_{user_id}",
            {
                "type": "close_self_ws",
            },
        )

    @staticmethod
    async def user_left(tournament_id, alias, user_id):
        data = {"alias": alias}
        await TournamentWorkerConsumer.disconnect_user(user_id)
        await TournamentWorkerConsumer.send_group_message(tournament_id, "registration_canceled", data)


async def main():
    TournamentWorkerConsumer()
    channel_layer = get_channel_layer()
    while True:
        await channel_layer.receive("tournament")


if __name__ == "__main__":
    asyncio.run(main())
