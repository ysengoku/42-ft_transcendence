import logging
from uuid import UUID

logger = logging.getLogger("server")


class Validator:
    def all_required_fields_are_present(action, data) -> bool:
        required_fields = {
            "new_message": ["content", "chat_id"],
            "notification": ["message", "type"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "game_invite": ["client_id", "username"],
            "reply_game_invite": ["username", "accept"],
            "game_accepted": ["username"],
            "game_declined": ["username"],
            "new_tournament": ["tournament_id", "tournament_name", "organizer_id"],
            "add_new_friend": ["sender_id", "receiver_id"],
            "user_online": ["username"],
            "user_offline": ["username"],
        }

        if action in required_fields:
            for field in required_fields[action]:
                if field not in data:
                    logger.warning("Missing field [{%s}] for action {%s}", field, action)
                    return False
        return True

    def validate_action_data(action, data) -> bool:
        if not Validator.all_required_fields_are_present(action, data):
            return False

        expected_types = {
            "new_message": {"content": str, "chat_id": str},
            "like_message": {"id": str, "chat_id": str},
            "unlike_message": {"id": str, "chat_id": str},
            "read_message": {"id": str},
            "read_notification": {"id": str},
            "notification": {"message": str, "type": str},
            "game_invite": {"client_id": str, "username": str},
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
                if value and not Validator.is_valid_uuid(value):
                    logger.warning("Invalid UUID format for '%s', the value is %s", field, value)
                    return False

        return True

    @staticmethod
    def is_valid_uuid(value) -> bool:
        try:
            UUID(str(value))
            return True
        except ValueError:
            return False

    @staticmethod
    def check_str_option(options, option, dict_options) -> bool:
        if option is not None:
            if not isinstance(option, str) or option not in dict_options:
                logger.warning("%s must be one of %s", options, dict_options)
                return False
        return True

    @staticmethod
    def check_bool_option(options, option) -> bool:
        if option is not None:
            if not isinstance(option, bool):
                logger.warning("%s must be a boolean", options)
                return False
        return True

    @staticmethod
    def check_int_option(options, option, val_min, val_max) -> bool:
        if option is not None:
            if not isinstance(option, int) or not (val_min <= option <= val_max):
                logger.warning("%s must be an int between %d and %d", options, val_min, val_max)
                return False
        return True

    @staticmethod
    def validate_options(options) -> bool:
        if not isinstance(options, dict):
            logger.warning("Invalid type for 'options'")
            return False
        RANKED = "ranked"
        GAME_SPEED = "game_speed"
        SCORE_TO_WIN = "score_to_win"
        TIME_LIMIT = "time_limit"
        COOL_MODE = "cool_mode"
        schema = {RANKED, GAME_SPEED, SCORE_TO_WIN, TIME_LIMIT, COOL_MODE}
        for field in schema:
            if field not in options:
                continue
            if options.get(field) is None:
                logger.warning("Field [{%s}] is None for action game_invite", field)
                return False

        allowed_game_speeds = {"slow", "normal", "fast"}
        min_score, max_score = 3, 20
        min_time, max_time = 1, 5

        if not Validator.check_str_option(GAME_SPEED, options.get(GAME_SPEED), allowed_game_speeds):
            return False
        if not Validator.check_bool_option(RANKED, options.get(RANKED)):
            return False
        if not Validator.check_bool_option(COOL_MODE, options.get(COOL_MODE)):
            return False
        if not Validator.check_int_option(SCORE_TO_WIN, options.get(SCORE_TO_WIN), min_score, max_score):
            return False
        if not Validator.check_int_option(TIME_LIMIT, options.get(TIME_LIMIT), min_time, max_time):
            return False
        return True


