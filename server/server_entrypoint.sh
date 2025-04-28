#!/bin/sh

# Appliquer les migrations et collecter les fichiers statiques
python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Lancer le serveur Django avec Daphne en arrière-plan
echo "Démarrage du serveur Daphne..."
daphne -b 0.0.0.0 -p 8000 server.asgi:application &

# Attendre que le serveur soit prêt
echo "Vérification que le serveur est prêt..."
until curl -s http://localhost:8000 > /dev/null; do
  echo "En attente du serveur..."
  sleep 2
done
echo "Application du crontab..."
crontab /etc/cron.d/check_inactive_users_cron
# Démarrer cron
echo "Démarrage de cron..."
cron -f