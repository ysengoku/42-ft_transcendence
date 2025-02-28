import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from users.models import UserOnlineStatus


class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope["user"]
        print(self.user)

        if not self.user.is_authenticated:
            self.close()
            return

        # Créer ou récupérer l'entrée de statut en ligne
        online_status, created = UserOnlineStatus.objects.get_or_create(user=self.user)
        online_status.increment_connection()

        # Ajouter l'utilisateur au groupe
        self.group_name = "online_users"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)

        self.accept()

        # Annoncer le statut
        self._announce_status(True)

    def disconnect(self, close_code):
        if not hasattr(self, "user") or not self.user.is_authenticated:
            return

        # Décrémenter le nombre de connexions
        online_status, _ = UserOnlineStatus.objects.get_or_create(user=self.user)
        online_status.decrement_connection()

        # Annoncer le statut
        self._announce_status(False)

        # Retirer du groupe
        async_to_sync(self.channel_layer.group_discard)(self.group_name, self.channel_name)

    def _announce_status(self, status):
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                "type": "user_status", 
                "user_id": str(self.user.id), 
                "username": self.user.username, 
                "online": status
            }
        )

    def user_status(self, event):
        self.send(text_data=json.dumps({
            "type": "status_update",
            "user_id": event["user_id"],
            "username": event["username"],
            "online": event["online"],
        }))