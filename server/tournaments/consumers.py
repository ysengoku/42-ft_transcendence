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
            logger.warning("TournamentConsumer : Unauthentificated user trying to connect")
            self.close()
            return
        self.tournament_id = self.scope["url_route"]["kwargs"].get("tournament_id")

        try:
            tournament = Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            logger.warning("This tournament id does not exist : %S", tournament_id)
            self.close()
        async_to_sync(self.channel_layer.group_add)(
            f"tournament_{self.tournament_id}", 
            self.channel_name
        )
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
                    logger.warning("Missing field [{%s}] for action {%s}", field, action)
                    return
        if not self.validate_action_data(action, entire_data):
            return

        match action:
            case "start_round":
                self.start_round(data)
            case "match_result":
                self.handle_match_result(data)
            case _:
                logger.debug("Tournament unknown action : %s", action)

    def validate_action_data(self, action, data):
        expected_types = {
            "start_round": {"round_number": int},
            "match_result": {"round_number": int, "result": int, "tournament_id": str},
        }

        uuid_fields = {
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
                        field,
                        expected_type.__name__,
                        type(value).__name__,
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


    def user_left(self, data):
        """
        TODO: code this properly
        When the participant cancels their own participation, it sends user_left
        """
        logger.debug("Bye everyone ! %s", data)

    def start_round(self, data):
        tournament = Tournament.objects.get(id=self.tournament_id)

        new_round = Round.objects.create(tournament=tournament)

        brackets = self.generate_brackets(tournament.participants.all())

        async_to_sync(self.channel_layer.group_send)(
            f"tournament_{self.tournament_id}",
            {
                "type": "tournament.broadcast",
                "action": "round_start",
                "data": {"round_number": new_round.number, "brackets": brackets},
            },
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
        self.send(text_data=json.dumps({"action": "new_tournament", "data": event["data"]}))
        logger.debug(event["data"])
        # if tournament_id is None:
        #     logger.warning("Wrong tournament_id send by the alias %s", alias)
        #     return
        # try:
        #     tournament = Tournament.objects.get(id=tournament_id)
        #     tournament_name = tournament.name
        #     tournament_creator = tournament.creator
        # except Tournament.DoesNotExist:
        #     logger.warning("This tournament does not exist")
        #     return
        #
        # all_profiles = Profile.objects.exclude(pk=tournament_creator.pk)
        #
        # channel_layer = get_channel_layer()
        #
        # for profile in all_profiles:
        #     invitation = TournamentInvitation.objects.create(
        #         sender=tournament_creator,
        #         recipient=profile,
        #         tournament_id = str(tournament_id),
        #         tournament_name=tournament_name,
        #         alias = alias,
        #         status=TournamentInvitation.OPEN,
        #     )
        #     tournament_creator.refresh_from_db()
        #     notification = Notification.objects.action_send_tournament_invite(
        #         receiver=profile,
        #         sender=tournament_creator,
        #         notification_data={
        #             "tournament_id": str(tournament_id),
        #             "tournament_name": tournament_name,
        #             "alias": alias,
        #             "invitation_id": str(invitation.id),
        #         },
        #     )
        #     notification_data = notification.data.copy()
        #     if "date" in notification_data and isinstance(notification_data["date"], datetime):
        #         notification_data["date"] = notification_data["date"].isoformat()
        #     async_to_sync(channel_layer.group_send)(
        #         f"user_{profile.user.id}",
        #         {
        #             "type": "chat_message",
        #             "message": json.dumps(
        #                 {
        #                     "action": "new_tournament",
        #                     "data": notification_data,
        #                 },
        #             ),
        #         },
        #     )

    def new_registration(self, event):
        logger.debug("function new_registration")
        logger.info(event)
        self.send(
            text_data=json.dumps(
                {
                    "action": "new_registration",
                    "data": {
                    }
                }
            )
        )

    def last_registration(self, event):
        logger.debug("function last_registration")
        logger.info(event)
        self.send(
            text_data=json.dumps(
                {
                    "action": "last_registration",
                    "data": {
                    }
                }
            )
        )

    def generate_brackets(self, participants):
        """
        """
        logger.debug("function generate_brackets")
        pass
