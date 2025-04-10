# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers requirements et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le projet
COPY . .
COPY ./crontab/check_inactive_users_cron /etc/cron.d/check_inactive_users_cron
RUN chmod 0644 /etc/cron.d/check_inactive_users_cron

# Appliquer le crontab
RUN crontab /etc/cron.d/check_inactive_users_cron
# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port
EXPOSE 8000

# Utiliser Daphne pour ASGI (support WebSocket)
#CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "server.asgi:application"]
CMD ["server_entrypoint.sh"]