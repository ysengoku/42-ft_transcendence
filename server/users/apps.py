from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self) -> None:
        from . import signals  # noqa: F401
        from .startup_env_warnings import warn_empty_default_envs_at_startup

        warn_empty_default_envs_at_startup()
