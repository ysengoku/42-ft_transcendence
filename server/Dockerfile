# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier tout le projet
COPY . .

# Copier les fichiers requirements et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Lire le .env explicitement AVANT collectstatic
RUN python -c "from django.core.management.utils import get_random_secret_key; import os; open('.env', 'a').write(f'\nCRON_SECRET={get_random_secret_key()}') if 'CRON_SECRET' not in os.environ else None"
# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port
EXPOSE 8000

# Utiliser Daphne pour ASGI (support WebSocket)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "server.asgi:application"]
