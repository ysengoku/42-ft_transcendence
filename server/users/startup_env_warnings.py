import logging
import os

logger = logging.getLogger("server")

ENV_WITH_EMPTY_DEFAULTS = [
    "CRON_SECRET",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "EMAIL_HOST_USER",
    "EMAIL_HOST_PASSWORD",
    "DEFAULT_FROM_EMAIL",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "API42_CLIENT_ID",
    "API42_CLIENT_SECRET",
    "NGINX_PORT",
    "ACCESS_TOKEN_SECRET_KEY",
    "REFRESH_TOKEN_SECRET_KEY",
    "HOST_IP",
]


def warn_empty_default_envs_at_startup() -> None:
    """
    Log warnings for env vars that have empty defaults and are empty/missing
    in the current environment. Never raises, only logs.
    """
    for key in ENV_WITH_EMPTY_DEFAULTS:
        val = os.getenv(key)
        if not val or str(val).strip() == "":
            logger.warning("Env var %s is missing or empty (default is '').", key)
