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

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# TODO: Change the secret key in production
SECRET_KEY = "your-secret-key"

# Environment variables
DEBUG = int(os.environ.get("DEBUG", default=1))
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")
CORS_ALLOW_ALL_ORIGINS = True  # En développement seulement

# if "GITHUB_ACTIONS" in os.environ:
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.postgresql",
#             "NAME": os.environ.get("DB_NAME"),
#             "USER": os.environ.get("DB_USER"),
#             "PASSWORD": os.environ.get("DB_PASSWORD"),
#             "HOST": "localhost",
#             "PORT": "5432",
#         }
#     }
# # PostgreSQL for production
# else:
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.postgresql",
#             "NAME": os.environ.get("POSTGRES_DB"),
#             "USER": os.environ.get("POSTGRES_USER"),
#             "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
#             "HOST": os.environ.get("DATABASE_HOST"),
#             "PORT": os.environ.get("DATABASE_PORT"),
#         }
#     }



DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB"),
        "USER": os.environ.get("POSTGRES_USER"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
        "HOST": os.environ.get("DATABASE_HOST"),
        "PORT": os.environ.get("DATABASE_PORT", 5432),
    },
}


INSTALLED_APPS = [
    # Default Django applications
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third-party applications
    "silk",  # Application for profiling
    "corsheaders",  # Application for CORS if two ports are different. must be removed for production
    "channels",  # Django Channels
    # Our applications
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
    # Third party middleware
    "silk.middleware.SilkyMiddleware",
    "corsheaders.middleware.CorsMiddleware",  #  must be removed for production.
]


ROOT_URLCONF = "server.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
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
        }
    },
}

# Configuration Django Channels
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

CSRF_TRUSTED_ORIGINS = ["https://localhost:1026"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ORIGINS = [
    "http://localhost:5173",
    "https://localhost:1026",
]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

# Configuration for picture
BASE_DIR = Path(__file__).resolve().parent.parent

# for dynamic images (uploaded by user)
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

AUTH_SETTINGS = {
    "password_min_len": 8,
    "repeats_allowed": 3,
    "check_attribute_similarity": True,
    "check_is_diverse": True,
}
