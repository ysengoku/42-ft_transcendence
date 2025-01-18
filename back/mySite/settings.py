#!/usr/bin/env python
import os
import sys
from pathlib import Path

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mySite.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you forget to activate a virtual environment?"
        ) from exc

    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()

# Django settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = 'your-secret-key'
DEBUG = int(os.environ.get('DEBUG', default=0))
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
CORS_ALLOW_ALL_ORIGINS = True  # En développement seulement

INSTALLED_APPS = [
    # Autres applications Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'rest_framework',  # Django Rest Framework
    'channels',  # Django Channels
    'ninja',  # Django Ninja

    'users',  # Application users
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'mySite.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI_APPLICATION = 'mySite.wsgi.application'
ASGI_APPLICATION = 'mySite.asgi.application'  # Pour Django Channels

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB'),
        'USER': os.environ.get('POSTGRES_USER'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
        'HOST': os.environ.get('DATABASE_HOST', 'database'),  # Nom du service Docker
        'PORT': os.environ.get('DATABASE_PORT', 5432),
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = '/static/'

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    # 'allauth.account.auth_backends.AuthenticationBackend',
]

# ################# #
# project additions #
# ################# #
# CUSTOM USER MODEL

AUTH_USER_MODEL = 'users.User'

# URL après connexion réussie
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# Configuration OAuth 42
SOCIALACCOUNT_PROVIDERS = {
    'oauth2': {
        'APP': {
            'client_id': 'YOUR_CLIENT_ID',
            'secret': 'YOUR_CLIENT_SECRET',
            'key': ''
        }
    }
}

# Configuration Django Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# Configuration Django Ninja
NINJA_DOCS_URL = "/api/docs"
NINJA_OPENAPI_URL = "/api/openapi.json"

CSRF_TRUSTED_ORIGINS = ['https://localhost:1026']
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False

# Configuration for picture
BASE_DIR = Path(__file__).resolve().parent.parent

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/
STATIC_URL = '/static/'
# STATIC_ROOT = BASE_DIR / 'static' # / is to concatenate the path


# Le dossier où les fichiers statiques seront collectés
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# # Si vous avez des fichiers statiques supplémentaires (par exemple, dans un dossier statique pour l'admin), ajoutez-les ici :
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),  # Pour tout fichier statique supplémentaire que vous avez
]
