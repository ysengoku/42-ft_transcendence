# Utiliser l'image de base Python
FROM python:3.10-slim

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers requirements.txt d'abord pour optimiser le cache
COPY requirements.txt /app/

# Installer les dépendances Python
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copier tout le reste du projet
COPY . /app

# Copier et ajuster les permissions du script d'entrée
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Exposer le port 8000 pour Django
EXPOSE 8000

# Utiliser le script d'entrée
ENTRYPOINT ["/app/entrypoint.sh"]

# Commande pour démarrer Django en mode développement
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
