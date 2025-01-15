#!/bin/bash
# entrypoint.sh

# Appliquer les migrations si models.py est modifié
if [ -f "manage.py" ]; then
    python manage.py makemigrations
    python manage.py migrate
fi

# Démarrer le serveur Django
exec "$@"