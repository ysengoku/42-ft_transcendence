# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    procps \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers requirements et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le projet
COPY . .

# It's important to chmox the script
ENV chmox="chmod +x"
RUN $chmox ./django_init.sh

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port
EXPOSE 8000

# Utiliser Daphne pour ASGI (support WebSocket)
ENTRYPOINT ["./django_init.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "server.asgi:application"]
