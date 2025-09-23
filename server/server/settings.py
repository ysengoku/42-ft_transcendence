import os
import sys
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variables
# Init django-environ
env = environ.Env(
    NODE_ENV=(str, "development"),
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
    API42_CLIENT_ID=(str, ""),
    API42_CLIENT_SECRET=(str, ""),
    NGINX_PORT=(str, ""),
    ACCESS_TOKEN_SECRET_KEY=(str, ""),
    REFRESH_TOKEN_SECRET_KEY=(str, ""),
    SECRET_KEY=(str, "default"),
    MAX_ALIAS_LENGTH=(int, 12),
    MAX_TOURNAMENT_NAME_LENGTH=(int, 50),
    MAX_MESSAGE_LENGTH=(int, 255),
    REQUIRED_PARTICIPANTS_OPTIONS=(tuple, (4, 8)),
    HOST_IP=(str, ""),
)

env.read_env(env_file=str(BASE_DIR / ".env"))

SERVER_PORT = env("NGINX_PORT")

SECRET_KEY = env("SECRET_KEY")

DEBUG = env("NODE_ENV") != "production"
CRON_SECRET = env("CRON_SECRET")

MAX_ALIAS_LENGTH = env("MAX_ALIAS_LENGTH")
MAX_TOURNAMENT_NAME_LENGTH = env("MAX_TOURNAMENT_NAME_LENGTH")
MAX_MESSAGE_LENGTH = env("MAX_MESSAGE_LENGTH")
REQUIRED_PARTICIPANTS_OPTIONS = env("REQUIRED_PARTICIPANTS_OPTIONS")

HOST_IP = env("HOST_IP")
ALLOWED_HOSTS = env("ALLOWED_HOSTS", default=f"localhost,127.0.0.1,{HOST_IP}").split(",")


if "GITHUB_ACTIONS" in os.environ:
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
    # ASGI server for working with websockets and Django channels
    "daphne",
    "channels",
    # Our apps
    "users",
    "chat",
    "pong",
    "tournaments",
    # Security
    "csp",
    # Default Django applications
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "csp.middleware.CSPMiddleware",
]

X_FRAME_OPTIONS = "SAMEORIGIN"

SECURE_CONTENT_TYPE_NOSNIFF = True

if not DEBUG:
    CONTENT_SECURITY_POLICY = {
        "DIRECTIVES": {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "blob:"],
            "font-src": ["'self'", "data:"],
            "connect-src": ["'self'"],
        },
    }
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

# Custom user model
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

# For the tests
if "test" in sys.argv:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
else:
    REDIS_HOST = env("REDIS_HOST")
    REDIS_PORT = env("REDIS_PORT")
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [(REDIS_HOST, REDIS_PORT)],
                "expiry": 3,
                "channel_capacity": {
                    "game": 5000,
                },
            },
        },
    }


CSRF_TRUSTED_ORIGINS = [
    f"https://localhost:{SERVER_PORT}",
    "http://localhost:5173",
    f"https://nginx:{SERVER_PORT}",
    f"https://{HOST_IP}:{SERVER_PORT}",
]
CSRF_COOKIE_SECURE = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False

# Configuration for picture

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

ACCESS_TOKEN_LIFETIME = 15
REFRESH_TOKEN_LIFETIME = 120
ACCESS_TOKEN_SECRET_KEY = env("ACCESS_TOKEN_SECRET_KEY")
REFRESH_TOKEN_SECRET_KEY = env("REFRESH_TOKEN_SECRET_KEY")

NINJA_PAGINATION_PER_PAGE = 10

APPEND_SLASH = False

# OAuth
GITHUB_CLIENT_ID = env("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = env("GITHUB_CLIENT_SECRET")

OAUTH_ALLOWED_SCOPES = {
    "github": {"read:user", "user:email"},
    "42": {"public", "profile"},
}

# OAuth
API42_CLIENT_ID = env("API42_CLIENT_ID")
API42_CLIENT_SECRET = env("API42_CLIENT_SECRET")

HOME_REDIRECT_URL = f"https://localhost:{SERVER_PORT}/home"
FRONTEND_URL = f"https://localhost:{SERVER_PORT}"
ERROR_REDIRECT_URL = f"https://localhost:{SERVER_PORT}/error"

GITHUB_REDIRECT_URI = f"https://localhost:{SERVER_PORT}/api/oauth/callback/github"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"  # noqa: S105
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_USER_PROFILE_URL = "https://api.github.com/user"
GITHUB_OAUTH_URL = "https://api.github.com"

FT_API_REDIRECT_URI = f"https://localhost:{SERVER_PORT}/api/oauth/callback/42"
FT_API_ACCESS_TOKEN_URL = "https://api.intra.42.fr/oauth/token"  # noqa: S105
FT_API_AUTHORIZE_URL = "https://api.intra.42.fr/oauth/authorize"
FT_API_USER_PROFILE_URL = "https://api.intra.42.fr/v2/me"
FT_API_OAUTH_URL = "https://api.intra.42.fr"

# OAUTH Configuration
OAUTH_CONFIG = {
    "github": {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "auth_uri": GITHUB_AUTHORIZE_URL,
        "token_uri": GITHUB_ACCESS_TOKEN_URL,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scopes": list(OAUTH_ALLOWED_SCOPES["github"]),
        "user_info_uri": GITHUB_USER_PROFILE_URL,
        "oauth_uri": GITHUB_OAUTH_URL,
    },
    "42": {
        "client_id": API42_CLIENT_ID,
        "client_secret": API42_CLIENT_SECRET,
        "auth_uri": FT_API_AUTHORIZE_URL,
        "token_uri": FT_API_ACCESS_TOKEN_URL,
        "redirect_uri": FT_API_REDIRECT_URI,
        "scopes": list(OAUTH_ALLOWED_SCOPES["42"]),
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
            "level": "DEBUG",
        },
    },
    "loggers": {
        "server": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
