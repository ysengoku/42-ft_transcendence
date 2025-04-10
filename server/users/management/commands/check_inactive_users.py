from django.core.management.base import BaseCommand
from chat.consumers import check_inactive_users

class Command(BaseCommand):
    help = 'Vérifie les utilisateurs inactifs toutes les 5 minutes'

    def handle(self, *args, **options):
        check_inactive_users()
        self.stdout.write("Vérification des utilisateurs inactifs terminée.")