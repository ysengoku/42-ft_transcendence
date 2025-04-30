import logging

from django.core.management.base import BaseCommand

from users.consumers import check_inactive_users

logger = logging.getLogger("server")


class Command(BaseCommand):
    help = "Vérifie les utilisateurs inactifs toutes les 5 minutes"

    def handle(self, *args, **options):
        check_inactive_users()
        logger.info("Vérification des utilisateurs inactifs terminée.")
