#!/usr/bin/env python
import os
import sys
from pathlib import Path

import environ


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you forget to activate a virtual environment?",
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variables
# Init django-environ
env = environ.Env(
    DEBUG=(bool, False),
    IN_CONTAINER=(bool, False),
    CRON_SECRET=(str, ""),
    REDIS_HOST=(str, "redis"),
    REDIS_PORT=(int, 6379),
    POSTGRES_DB=(str, ""),
    POSTGRES_USER=(str, ""),
    POSTGRES_PASSWORD=(str, ""),
    DATABASE_HOST=(str, "database"),
    DATABASE_PORT=(str, "5432"),
    EMAIL_BACKEND=(str, "django.core.mail.backends.smtp.EmailBackend"),
    EMAIL_HOST=(str, "smtp.gmail.com"),
    EMAIL_PORT=(int, 587),
    EMAIL_USE_TLS=(bool, True),
    EMAIL_USE_SSL=(bool, False),
    EMAIL_HOST_USER=(str, ""),
    EMAIL_HOST_PASSWORD=(str, ""),
    DEFAULT_FROM_EMAIL=(str, ""),
    GITHUB_CLIENT_ID=(str, ""),
    GITHUB_CLIENT_SECRET=(str, ""),
    GITHUB_REDIRECT_URI=(str, ""),
    GITHUB_ACCESS_TOKEN_URL=(str, ""),
    GITHUB_AUTHORIZE_URL=(str, ""),
    GITHUB_USER_PROFILE_URL=(str, ""),
    GITHUB_FT_API_URL=(str, ""),
    API42_CLIENT_ID=(str, ""),
    API42_CLIENT_SECRET=(str, ""),
    FT_API_REDIRECT_URI=(str, ""),
    FT_API_ACCESS_TOKEN_URL=(str, ""),
    FT_API_AUTHORIZE_URL=(str, ""),
    FT_API_USER_PROFILE_URL=(str, ""),
    FT_API_OAUTH_URL=(str, ""),
    ACCESS_TOKEN_SECRET_KEY=(str, ""),
    REFRESH_TOKEN_SECRET_KEY=(str, ""),
    # value by default is set to 255, but env value overwrites it if present
    MAX_MESSAGE_LENGTH=(int, 255),
    # TODO: See if we can avoid setting a default value before -->
    # TODO: for the docker to work without having the real value
    # TODO: of SECRET_KEY yet                                  <--
    SECRET_KEY=(str, "default"),
)

env.read_env(env_file=str(BASE_DIR / ".env"))

# TODO: Change the secret key in production
SECRET_KEY = env("SECRET_KEY")

DEBUG = env("DEBUG")
CRON_SECRET = env("CRON_SECRET")

MAX_MESSAGE_LENGTH = env("MAX_MESSAGE_LENGTH")

ALLOWED_HOSTS = env("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

IN_CONTAINER = env("IN_CONTAINER")

if not IN_CONTAINER:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        },
    }
elif "GITHUB_ACTIONS" in os.environ:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": "test_db",
            "USER": "test_user",
            "PASSWORD": "test_password",
            "HOST": "localhost",
            "PORT": "5432",
        },
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER"),
            "PASSWORD": env("POSTGRES_PASSWORD"),
            "HOST": env("DATABASE_HOST"),
            "PORT": env("DATABASE_PORT"),
        },
    }


INSTALLED_APPS = [
    # ASGI server for working with websockets
    "daphne",
    "channels",
    # Our apps
    "users",
    "chat",
    "pong",
    # Default Django applications
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Profiling
    "silk",
    # Testing frameworks
    "rest_framework",
    "rest_framework_simplejwt",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "silk.middleware.SilkyMiddleware",
]


ROOT_URLCONF = "server.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ASGI_APPLICATION = "server.asgi.application"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True


SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# ################# #
# project additions #
# ################# #
# CUSTOM USER MODEL

AUTH_USER_MODEL = "users.User"
DEFAULT_USER_AVATAR = "/img/default_avatar.png"

# Configuration OAuth 42
SOCIALACCOUNT_PROVIDERS = {
    "oauth2": {
        "APP": {
            "client_id": "YOUR_CLIENT_ID",
            "secret": "YOUR_CLIENT_SECRET",
            "key": "",
        },
    },
}

REDIS_HOST = env("REDIS_HOST")
REDIS_PORT = env("REDIS_PORT")
# For the tests
if "test" in sys.argv:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [(REDIS_HOST, REDIS_PORT)],
            },
        },
    }


# Configuration for proxy
CSRF_TRUSTED_ORIGINS = ["https://localhost:1026",
                        "http://localhost:5173", "https://nginx:1026"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False

# Configuration for picture
BASE_DIR = Path(__file__).resolve().parent.parent

# for dynamic images (uploaded by user)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

AUTH_SETTINGS = {
    "password_min_len": 8,
    "check_attribute_similarity": True,
    "check_is_alphanumeric": True,
}

ACCESS_TOKEN_SECRET_KEY = env("ACCESS_TOKEN_SECRET_KEY")
REFRESH_TOKEN_SECRET_KEY = env("REFRESH_TOKEN_SECRET_KEY")

NINJA_PAGINATION_PER_PAGE = 10

APPEND_SLASH = False

# OAuth
GITHUB_CLIENT_ID = env("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = env("GITHUB_CLIENT_SECRET")
GITHUB_AUTHORIZE_URL = env("GITHUB_AUTHORIZE_URL")
GITHUB_ACCESS_TOKEN_URL = env("GITHUB_ACCESS_TOKEN_URL")
GITHUB_REDIRECT_URI = env("GITHUB_REDIRECT_URI")
GITHUB_USER_PROFILE_URL = env("GITHUB_USER_PROFILE_URL")
GITHUB_FT_API_URL = env("GITHUB_FT_API_URL")

# OAuth 42
API42_CLIENT_ID = env("API42_CLIENT_ID")
API42_CLIENT_SECRET = env("API42_CLIENT_SECRET")
FT_API_AUTHORIZE_URL = env("FT_API_AUTHORIZE_URL")
FT_API_ACCESS_TOKEN_URL = env("FT_API_ACCESS_TOKEN_URL")
FT_API_REDIRECT_URI = env("FT_API_REDIRECT_URI")
FT_API_USER_PROFILE_URL = env("FT_API_USER_PROFILE_URL")
FT_API_OAUTH_URL = env("FT_API_OAUTH_URL")

HOME_REDIRECT_URL = "https://localhost:1026/home"
FRONTEND_URL = "https://localhost:1026"
ERROR_REDIRECT_URL = "https://localhost:1026/error"

# OAUTH Configuration
OAUTH_CONFIG = {
    "github": {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "auth_uri": GITHUB_AUTHORIZE_URL,
        "token_uri": GITHUB_ACCESS_TOKEN_URL,
        "redirect_uris": [GITHUB_REDIRECT_URI],
        "scopes": ["user"],
        "user_info_uri": GITHUB_USER_PROFILE_URL,
        "oauth_uri": GITHUB_FT_API_URL,
    },
    "42": {
        "client_id": API42_CLIENT_ID,
        "client_secret": API42_CLIENT_SECRET,
        "auth_uri": FT_API_AUTHORIZE_URL,
        "token_uri": FT_API_ACCESS_TOKEN_URL,
        "redirect_uris": [FT_API_REDIRECT_URI],
        "scopes": ["public", "profile"],
        "user_info_uri": FT_API_USER_PROFILE_URL,
        "oauth_uri": FT_API_OAUTH_URL,
    },
}

# email configuration for 2fa and password reset
EMAIL_BACKEND = env("EMAIL_BACKEND")
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
EMAIL_USE_SSL = env("EMAIL_USE_SSL")
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "colored": {
            "()": "colorlog.ColoredFormatter",
            "format": "%(log_color)s%(levelname)s: %(message)s",
            "log_colors": {
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            },
        },
    },
    "handlers": {
        "console": {
            "class": "colorlog.StreamHandler",
            "formatter": "colored",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
}
