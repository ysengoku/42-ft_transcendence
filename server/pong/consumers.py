import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class GameConsumer(AsyncWebsocketConsumer):
    should_run = False
    update_lock = asyncio.Lock()

    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({"message": "Welcome!"}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        if message == "start":
            self.should_run = True
            asyncio.create_task(self.game_loop())
            return

        if message == "stop":
            self.should_run = False
            return

        await self.channel_layer.group_send(self.match_group_name, {"type": "match.message", "message": message})

    async def match_message(self, event):
        message = event["message"]
        await self.send(text_data=json.dumps({"message": message}))

    async def game_loop(self):
        count = 0
        while self.should_run:
            await self.channel_layer.group_send(self.match_group_name, {"type": "match.message", "message": count})
            count += 1
            await asyncio.sleep(1)
