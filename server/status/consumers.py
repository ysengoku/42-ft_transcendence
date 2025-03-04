import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

class OnlineStatusConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope["user"]
        self.status_group_name = 'online_status'

        async_to_sync(self.channel_layer.group_add)(
            self.status_group_name,
            self.channel_name
        )

        self.accept()

        async_to_sync(self.channel_layer.group_send)(
            self.status_group_name,
            {
                'type': 'user_online',
                'user_id': self.user.id
            }
        )

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_send)(
            self.status_group_name,
            {
                'type': 'user_offline',
                'user_id': self.user.id
            }
        )

        async_to_sync(self.channel_layer.group_discard)(
            self.status_group_name,
            self.channel_name
        )

    def receive(self, text_data):
        pass

    def user_online(self, event):
        user_id = event['user_id']

        self.send(text_data=json.dumps({
            'type': 'user_online',
            'user_id': user_id
        }))

    def user_offline(self, event):
        user_id = event['user_id']

        self.send(text_data=json.dumps({
            'type': 'user_offline',
            'user_id': user_id
        }))
