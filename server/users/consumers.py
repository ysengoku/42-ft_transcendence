import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from users.models import User  # Ajustez selon votre modèle


class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope["user"]

        # Vérifiez que l'utilisateur est authentifié
        if not self.user.is_authenticated:
            self.close()
            return

        # Ajouter l'utilisateur au groupe "online_users"
        self.group_name = "online_users"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)

        # Accepter la connexion
        self.accept()

        # Mettre à jour le statut de l'utilisateur en ligne
        self._set_user_online(True)

        # Annoncer aux autres utilisateurs
        self._announce_status(True)

    def disconnect(self, close_code):
        if not hasattr(self, "user") or not self.user.is_authenticated:
            return

        # Mettre à jour le statut de l'utilisateur hors ligne
        self._set_user_online(False)

        # Annoncer aux autres utilisateurs
        self._announce_status(False)

        # Retirer l'utilisateur du groupe
        async_to_sync(self.channel_layer.group_discard)(self.group_name, self.channel_name)

    def receive(self, text_data):
        # Ce consumer n'attend pas de messages spécifiques
        # Vous pourriez implémenter des fonctionnalités supplémentaires ici
        pass

    def user_status(self, event):
        """Reçoit les mises à jour de statut et les envoie au client"""
        self.send(
            text_data=json.dumps(
                {
                    "type": "status_update",
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "online": event["online"],
                }
            )
        )

    def _set_user_online(self, status):
        """Met à jour le statut en ligne dans la base de données"""
        # Option 1: Utilisez une propriété sur le modèle User
        # self.user.is_online = status
        # self.user.save(update_fields=['is_online'])

        # Option 2: Utilisez un modèle séparé pour le statut en ligne
        # UserOnlineStatus.objects.update_or_create(
        #     user=self.user,
        #     defaults={'is_online': status, 'last_seen': timezone.now()}
        # )

        # Option 3: Stockez le statut en cache (Redis)
        # from django.core.cache import cache
        # cache_key = f"user_online_{self.user.id}"
        # if status:
        #     cache.set(cache_key, True, timeout=3600)  # 1 heure de timeout
        # else:
        #     cache.delete(cache_key)

    def _announce_status(self, status):
        """Annonce le changement de statut à tous les utilisateurs connectés"""
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {"type": "user_status", "user_id": str(self.user.id), "username": self.user.username, "online": status},
        )
