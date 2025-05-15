# server/tournament/consumers.py
import json
import logging
import uuid

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Bracket, Participant, Round, Tournament

logger = logging.getLogger("server")


class TournamentConsumer(WebsocketConsumer):
    tournaments = {}

    def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            logger.warning(
                "TournamentConsumer : Unauthentificated user trying to connect")
            self.close()
            return
        self.tournament_id = self.scope['url_route']['kwargs'].get(
            'tournament_id')

        if self.tournament_id:
            async_to_sync(self.channel_layer.group_add)(
                f"tournament_{self.tournament_id}",
                self.channel_name
            )
        else:
            self.tournament_id = str(uuid.uuid4())
            self.tournaments[self.tournament_id] = {
                'creator': self.user,
                'participants': {},
                'status': 'start',
                'rounds': []
            }

        self.accept()

    def disconnect(self, close_code):
        if self.tournament_id:
            async_to_sync(self.channel_layer.group_discard)(
                f"tournament_{self.tournament_id}",
                self.channel_name
            )
        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament.broadcast",
                "action": "user_left",
                "data": {"user": self.user.username}
            }
        )

    def tournament_broadcast(self, event):
        # Send message to all connected clients
        self.send_json({
            "action": event["action"],
            "data": event["data"],
        })

    def create_tournament(self, data):
        with transaction.atomic():
            tournament = Tournament.objects.create(
                name=data['tournament_name'],
                creator=self.user,
                max_participants=data['required_participants'],
                status='lobby'
            )
            tournament.participants.add(self.user.profile)
            self.tournament_id = str(tournament.id)
        self.send(text_data=json.dumps({
            'action': 'created',
            'data': {'tournament_id': self.tournament_id}
        }))

    def cancel_tournament(self, data):
        """
        TODO code this properly
        When the organizer cancels the whole tournament
        """
        tournament_id = self.tournaments.get(self.tournament_id)
        if not tournament_id:
            self.send(text_data=json.dumps({
                'action': 'tournament_cancel_fail',
                'data': {'reason': 'This tournament does not exist'}
            }))
            logger.warning(
                "%s tried to cancel the tournament %s but it does not exist", self.user.username, tournament_id)
            return
            # if user_id != organizer_id:
            # self.send(text_data=json.dumps({
            #     'action': 'tournament_cancel_fail',
            #     'data': {'reason': 'Not the organizer'}
            # }))
            #     logger.warning(
            #         "%s tried to cancel the tournament, but they're not the organizer !", user.username)
            # if tournament id does not exist
            # self.send(text_data=json.dumps({
            #     'action': 'tournament_cancel_fail',
            #     'data': {'reason': 'This tournament does not exist'}
            # }))
            #     logger.warning(
            #         "%s tried to cancel the tournament %s but it does not exist", user.username, tournament_id)
            #     return

    def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get('action')

            if not action:
                logger.warning("Tournament: Message without action received")
                return

            text_data_json.get("data", {})
            entire_data = text_data_json.get("data", {})
            required_fields = {
                "create": ["tournament_name", "required_participants", "alias"],
                "register": ["alias"],
                "start_round": ["id", "chat_id"],
                "match_result": ["id", "chat_id"],
            }

            if action in required_fields:
                for field in required_fields[action]:
                    if field not in entire_data:
                        logger.warning(
                            "Missing field [{%s}] for action {%s}", field, action)
                        return
            if not self.validate_action_data(action, entire_data):
                return
        match action:
            case 'create':
                self.create_tournament(data)
            case 'cancel':
                self.cancel_tournament(data)
            case 'register':
                self.register_participant(data)
            case 'start_round':
                self.start_round(data)
            case 'match_result':
                self.handle_match_result(data)
            case _:
                logger.debug("Tournament unknown action : %s", action)

    def validate_action_data(self, action, data):
        expected_types = {
            "create": {"tournament_name": str, "register_participant": int, "alias": str},
            "cancel": {"tournament_name": str, "alias": str},
            "register": {"alias": str},
            "start_round": {"round_number": int},
            "match_result": {"round_number": int, "result": int, "tournament_id": str},
        }

        uuid_fields = {
            # "create": ["tournament_id"],
            "cancel": ["tournament_id"],
            # "register": ["id"],
            # "start_round": ["id"],
            # "match_result": ["tournament_id"],
        }
       # Types verification
        if action in expected_types:
            for field, expected_type in expected_types[action].items():
                value = data.get(field)
                if not isinstance(value, expected_type):
                    logger.warning(
                        "Invalid type for '%s' (waited for %s, received %s)",
                        field, expected_type.__name__, type(value).__name__,
                    )
                    return False

        # UUID verification
        if action in uuid_fields:
            for field in uuid_fields[action]:
                value = data.get(field)
                if value and not self.is_valid_uuid(value):
                    logger.warning("Invalid UUID format for '%s'", field)
                    return False

        return True

    def create_tournament(self, data):
        required = ['tournament_name', 'required_participants', 'alias']
        if not all(key in data for key in required):
            raise ValidationError(
                "Données manquantes pour la création du tournoi")

        self.tournaments[self.tournament_id].update({
            'name': data['tournament_name'],
            'max_participants': data['required_participants'],
            'creator_alias': data['alias']
        })

        self.send(text_data=json.dumps({
            'action': 'created',
            'data': {'tournament_id': self.tournament_id}
        }))

    def cancel_participant(self, data):
        """
        TODO code this properly
        When the participant cancels their own participation
        """

    def register_participant(self, data):
        register_data = data.get("data", {})
        alias = register_data.get("alias")

        try:
            with transaction.atomic():
                tournament = Tournament.objects.get(id=self.tournament_id)
                if tournament.name != alias:
                    self.send(text_data=json.dumps({
                        'action': 'register_fail',
                        'data': {'reason': "Tournament's alias is invalid"}
                    }))
                    return

                if tournament.participants.count() >= tournament.max_participants:
                self.send(text_data=json.dumps({
                    'action': 'register_fail',
                    'data': {'reason': 'Tournament is full'}
                }))
                return

                tournament.participants.add(self.user.profile)
                tournament.save()

                async_to_sync(self.channel_layer.group_send)(
                    f"tournament_{self.tournament_id}",
                    {
                        'type': 'tournament.broadcast',
                        'action': 'new_registration',
                        'data': {
                            'current_participants': len(tournament['participants']),
                            'max_participants': tournament['max_participants']
                        }
                    }
                )

        except Tournament.DoesNotExist:
            self.send(text_data=json.dumps({
                'action': 'register_fail',
                'data': {'reason': 'Tournament does not exist'}
            }))
            logger.warning(
                "%s tried to register to a tournament that does not exist", self.user.username)
            return

    def start_round(self, data):
        tournament = Tournament.objects.get(id=self.tournament_id)

        new_round = Round.objects.create(tournament=tournament)

        brackets = self.generate_brackets(tournament.participants.all())

        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                'type': 'tournament.broadcast',
                'action': 'round_start',
                'data': {
                    'round_number': new_round.number,
                    'brackets': brackets
                }
            }
        )

    # def start_round(self, data):
    #     tournament = self.tournaments[self.tournament_id]
    #     current_round = len(tournament['rounds']) + 1
    #
    #     brackets = self.generate_brackets(tournament['participants'])
    #
    #     tournament['rounds'].append({
    #         'number': current_round,
    #         'brackets': brackets,
    #         'status': 'ongoing'
    #     })
    #
    #     async_to_sync(self.channel_layer.group_send)(
    #         f"tournament_{self.tournament_id}",
    #         {
    #             'type': 'tournament.broadcast',
    #             'action': 'round_start',
    #             'data': {
    #                 'round_number': current_round,
    #                 'brackets': brackets
    #             }
    #         }
    #     )

    def tournament_broadcast(self, event):
        self.send(text_data=json.dumps({
            'action': event['action'],
            'data': event['data']
        }))

    def generate_brackets(self, participants):
        """
        Implémentation de la logique de génération des brackets
        # (ex: algorithme de tournoi à élimination directe)
        """
        pass
