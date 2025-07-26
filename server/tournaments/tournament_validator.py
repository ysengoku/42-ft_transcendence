import logging

logger = logging.getLogger("server")


class Validator:
    @staticmethod
    def all_required_fields_are_present(action, data) -> bool:
        required_fields = {
            "new_registration": ["alias", "avatar"],
            "last_registration": ["alias", "avatar"],
            "user_left": ["alias"],
            "tournament_message": ["alias", "avatar"],
            "tournament_game_finished": ["bracket_id"],
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
            "new_registration": {"alias": str, "avatar": str},
            "last_registration": {"alias": str, "avatar": str},
            "user_left": {"alias": str},
            "tournament_message": {"alias": str, "avatar": str},
            "tournament_game_finished": {"bracket_id": str},
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
        return True
