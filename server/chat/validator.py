import logging
from uuid import UUID

logger = logging.getLogger("server")


class Validator:
    @staticmethod
    def all_required_fields_are_present(action, data) -> bool:
        required_fields = {
            "new_message": ["content", "chat_id", "timestamp"],
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
            "cancel_game_invite": ["username"],
        }

        if action in required_fields:
            for field in required_fields[action]:
                if field not in data:
                    logger.warning("Missing field [{%s}] for action {%s}", field, action)
                    return False
        return True

    @staticmethod
    def validate_action_data(action, data) -> bool:
        if not Validator.all_required_fields_are_present(action, data):
            return False

        expected_types = {
            "new_message": {"content": str, "chat_id": str, "timestamp": str},
            "like_message": {"id": str, "chat_id": str},
            "unlike_message": {"id": str, "chat_id": str},
            "read_message": {"id": str},
            "read_notification": {"id": str},
            "notification": {"message": str, "type": str},
            "game_invite": {"client_id": str, "username": str},
            "reply_game_invite": {"accept": bool, "username": str},
            "game_accepted": {"accept": bool},
            "game_declined": {"accept": bool},
            "cancel_game_invite": {"username": str},
        }

        uuid_fields = {
            "new_message": ["chat_id"],
            "like_message": ["id", "chat_id"],
            "unlike_message": ["id", "chat_id"],
            "read_message": ["id"],
            "read_notification": ["id"],
            "new_tournament": ["id", "organizer_id"],
            "add_new_friend": ["id"],
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
    def check_str_option(settings, option, dict_settings) -> bool:
        if option is None:
            return True
        if not isinstance(option, str) or option not in dict_settings:
            logger.warning("%s must be one of %s and currently is %s", settings, dict_settings, option)
            return False
        return True

    @staticmethod
    def check_bool_option(settings, option) -> bool:
        if option is not None and not isinstance(option, bool):
            logger.warning("%s must be a boolean", settings)
            return False
        return True

    @staticmethod
    def check_int_option(settings, option, val_min, val_max) -> bool:
        if option is None:
            return True
        if not isinstance(option, int) or not (val_min <= option <= val_max):
            logger.warning("%s must be an int between %d and %d", settings, val_min, val_max)
            return False
        return True

    @staticmethod
    def validate_settings(settings) -> bool:
        if not isinstance(settings, dict):
            logger.warning("Invalid type for 'settings'")
            return False
        ranked = "ranked"
        game_speed = "game_speed"
        score_to_win = "score_to_win"
        time_limit = "time_limit"
        cool_mode = "cool_mode"
        schema = {ranked, game_speed, score_to_win, time_limit, cool_mode}
        for field in schema:
            if field not in settings:
                continue
            if settings.get(field) is None:
                logger.warning("Field [{%s}] is None for action game_invite", field)
                return False

        allowed_game_speeds = {"slow", "medium", "fast"}
        min_score, max_score = 3, 20
        min_time, max_time = 1, 5

        return (
            Validator.check_str_option(game_speed, settings.get(game_speed), allowed_game_speeds)
            and Validator.check_bool_option(ranked, settings.get(ranked))
            and Validator.check_bool_option(cool_mode, settings.get(cool_mode))
            and Validator.check_int_option(score_to_win, settings.get(score_to_win), min_score, max_score)
            and Validator.check_int_option(time_limit, settings.get(time_limit), min_time, max_time)
        )
