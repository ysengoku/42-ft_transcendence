import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

class NotificationConsumer(WebsocketConsumer):
    def connect(self):
        self.user_id = self.scope['user'].id
        self.group_name = f'user_{self.user_id}'

        # Rejoindre le groupe des notifications de l'utilisateur
        async_to_sync(self.channel_layer.group_add)(
            self.notification_group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        # Quitter le groupe des notifications de l'utilisateur
        async_to_sync(self.channel_layer.group_discard)(
            self.notification_group_name,
            self.channel_name
        )

    def send_notification(self, event):
        notification = event['notification']
        
        # Envoyer la notification au WebSocket
        self.send(text_data=json.dumps({'notification': notification}))
