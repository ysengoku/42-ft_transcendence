import logging
from uuid import UUID

logger = logging.getLogger("server")


class Validator:
    def all_required_fields_are_present(self, data):
        required_fields = {
            "new_message": ["content", "chat_id"],
            "notification": ["message", "type"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "game_invite": ["username"],
            "reply_game_invite": ["username", "accept"],
            "game_accepted": ["username"],
            "game_declined": ["username"],
            "new_tournament": ["tournament_id", "tournament_name", "organizer_id"],
            "add_new_friend": ["sender_id", "receiver_id"],
            "user_online": ["username"],
            "user_offline": ["username"],
        }

        if self in required_fields:
            for field in required_fields[self]:
                if field not in data:
                    logger.warning("Missing field [{%s}] for action {%s}", field, self)
                    return False
        return True

    def validate_action_data(self, data):
        if not Validator.all_required_fields_are_present(self, data):
            return False

        expected_types = {
            "new_message": {"content": str, "chat_id": str},
            "like_message": {"id": str, "chat_id": str},
            "unlike_message": {"id": str, "chat_id": str},
            "read_message": {"id": str},
            "read_notification": {"id": str},
            "notification": {"message": str, "type": str},
            "game_invite": {"client_id": str, "username": str, "options": dict},
            "reply_game_invite": {"accept": bool, "username": str},
            "game_accepted": {"accept": bool},
            "game_declined": {"accept": bool},
        }

        uuid_fields = {
            "new_message": ["chat_id"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "read_notification": ["id"],
            # TODO : check these ids
            "new_tournament": ["id", "organizer_id"],
            "add_new_friend": ["id"],
            "join_chat": ["chat_id"],
            "room_created": ["chat_id"],
        }
        # Types verification
        if self in expected_types:
            for field, expected_type in expected_types[self].items():
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
        if self in uuid_fields:
            for field in uuid_fields[self]:
                value = data.get(field)
                if value and not Validator.is_valid_uuid(value):
                    logger.warning("Invalid UUID format for '%s', the value is %s", field, value)
                    return False

        return True

    def is_valid_uuid(self):
        try:
            UUID(str(self))
            return True
        except ValueError:
            return False

    def check_str_option(self, option, dict_options):
        if option is not None:
            if isinstance(option, str) and option == "any":
                return True
            if not isinstance(option, str) or option not in dict_options:
                logger.warning("%s must be one of %s", self, dict_options)
                return False
        return True

    def check_bool_option(self, option):
        if option is not None:
            if isinstance(option, str) and option == "any":
                return True
            if not isinstance(option, bool):
                logger.warning("%s must be a boolean", self)
                return False
        return True

    def check_int_option(self, option, val_min, val_max):
        if option is not None:
            if isinstance(option, str) and option == "any":
                return True
            if not isinstance(option, int) or not (val_min <= option <= val_max):
                logger.warning("%s must be an int between %d and %d", self, val_min, val_max)
                return False
        return True

    def validate_options(self):
        schema = {"game_speed", "is_ranked", "score_to_win", "time_limit_minutes"}
        for field in schema:
            if field not in self:
                logger.warning("Missing field [{%s}] for action game_invite", field)
                return False
            if self.get(field) is None:
                logger.warning("Field [{%s}] if None for action game_invite", field)
                return False

        allowed_game_speeds = {"slow", "normal", "fast"}
        min_score, max_score = 3, 20
        min_time, max_time = 1, 5

        if not Validator.check_str_option("game_speed", self.get("game_speed"), allowed_game_speeds):
            return False
        if not Validator.check_bool_option("is_ranked", self.get("is_ranked")):
            return False
        if not Validator.check_int_option("score_to_win", self.get("score_to_win"), min_score, max_score):
            return False
        return Validator.check_int_option("time_limit_minutes", self.get("time_limit_minutes"), min_time, max_time)


