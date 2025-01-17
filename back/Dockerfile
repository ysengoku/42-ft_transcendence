# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
RUN mkdir /app
WORKDIR /app

# Copier les fichiers requirements.txt d'abord pour optimiser le cache
COPY requirements.txt /app/

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le reste du projet
COPY . /app

# Exposer le port 8000 pour Django
EXPOSE 8000

# Utiliser daphne pour démarrer l'application
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "mySite.asgi:application"]

#Django avec runserver ne prend pas en charge les WebSockets.
# Daphne, en revanche, est conçu pour gérer les protocoles HTTP et WebSocket

# [ Utilisateur ] ⇄ [ Nginx (SSL, Proxy) ] ⇄ [ Daphne (ASGI) ] ⇄ [ Django ]
 #                                       ⇄ [ PostgreSQL / Redis (gestion du cache) ]
