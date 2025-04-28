# server/tournament/consumers.py
import json
import logging
import uuid

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.exceptions import ValidationError

logger = logging.getLogger("server")


class TournamentConsumer(WebsocketConsumer):
    tournaments = {}

    def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
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
                'creator': self.scope['user'],
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
                "register": ["id", "chat_id"],
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

    def register_participant(self, data):
        tournament = self.tournaments.get(self.tournament_id)

        if not tournament:
            raise ValidationError("Tournoi introuvable")

        if len(tournament['participants']) >= tournament['max_participants']:
            self.send(text_data=json.dumps({
                'action': 'register_fail',
                'data': {'reason': 'Tournoi complet'}
            }))
            return

        user = self.scope['user']
        tournament['participants'][str(user.id)] = {
            'user': user,
            'alias': data.get('alias', user.username),
            'status': 'registered'
        }

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

    def start_round(self, data):
        tournament = self.tournaments[self.tournament_id]
        current_round = len(tournament['rounds']) + 1

        brackets = self.generate_brackets(tournament['participants'])

        tournament['rounds'].append({
            'number': current_round,
            'brackets': brackets,
            'status': 'ongoing'
        })

        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                'type': 'tournament.broadcast',
                'action': 'round_start',
                'data': {
                    'round_number': current_round,
                    'brackets': brackets
                }
            }
        )

    def tournament_broadcast(self, event):
        self.send(text_data=json.dumps({
            'action': event['action'],
            'data': event['data']
        }))

    def generate_brackets(self, participants):
        # Implémentation de la logique de génération des brackets
        # (ex: algorithme de tournoi à élimination directe)
        pass
