FROM python:3.10-alpine

RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    postgresql-dev \
    libmagic \
    curl \
    bash \
    dcron

WORKDIR /app

# Copier uniquement les fichiers nécessaires
COPY server/ ./server/
COPY requirements.txt .
COPY crontab/crontab/check_inactive_users_cron /etc/cron.d/check_inactive_users_cron

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Configurer le fichier crontab
RUN chmod 0644 /etc/cron.d/check_inactive_users_cron
RUN crontab /etc/cron.d/check_inactive_users_cron

ENV DJANGO_SETTINGS_MODULE=server.settings

#COPY ./crontab/crontab/check_inactive_users.py /app/check_inactive_users.py


RUN crontab /etc/cron.d/check_inactive_users_cron

CMD ["cron", "-f"]