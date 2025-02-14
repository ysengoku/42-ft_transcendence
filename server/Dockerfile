# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
RUN mkdir /app
WORKDIR /app

# Copier les fichiers requirements.txt d'abord pour optimiser le cache
COPY requirements.txt /app/

# psycopg2 is a PostgreSQL adapter for Python. this version is compatible with Django 5.1.4 + act (to test github actions)
RUN echo "psycopg2==2.9.6" >> requirements.txt

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le reste du projet
COPY . /app

# Exposer le port 8000 pour Gunicorn
EXPOSE 8000

# Utiliser Gunicorn pour démarrer l'application
CMD ["gunicorn", "-b", "0.0.0.0:8000", "server.wsgi:application"]

# [ Utilisateur ] ⇄ [ Nginx (SSL, Proxy) ] ⇄ [ Gunicorn (ASGI) ] ⇄ [ Django ]
#                                        ⇄ [ PostgreSQL / Redis (gestion du cache) ]
