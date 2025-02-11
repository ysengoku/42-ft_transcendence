#!/usr/bin/env python
import os
import sys
from pathlib import Path


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

# TODO: Change the secret key in production
SECRET_KEY = "your-secret-key"

# Environment variables
DEBUG = int(os.environ.get("DEBUG", default=1))
IN_CONTAINER = int(os.environ.get("IN_CONTAINER", default=0))


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
# PostgreSQL for production
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB"),
            "USER": os.environ.get("POSTGRES_USER"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
            "HOST": os.environ.get("DATABASE_HOST", "database"),
            "PORT": os.environ.get("DATABASE_PORT", "5432"),
        },
    }


INSTALLED_APPS = [
    # ASGI server for working with websockets
    "daphne",

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

    "channels",

    "users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
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

# WSGI_APPLICATION = 'server.wsgi.application'
ASGI_APPLICATION = "server.asgi.application"  # Pour Django Channels


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

# Configuration Django Channels
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

CSRF_TRUSTED_ORIGINS = ["https://localhost:1026", "http://localhost:5173"]
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

ACCESS_TOKEN_SECRET_KEY = "secret"
REFRESH_TOKEN_SECRET_KEY = "refresh_secret"

NINJA_PAGINATION_PER_PAGE = 10
APPEND_SLASH = False
