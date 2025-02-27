import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class GameConsumer(AsyncWebsocketConsumer):
    def initialize_or_load_the_state(self):
        self.state = 0

    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)

        await self.accept()

        self.initialize_or_load_the_state()
        self.should_run = False
        await self.send(text_data=json.dumps({"message": "Welcome!"}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        await self.channel_layer.group_send(self.match_group_name, {"type": "match.command", "action": action})

    def calculate_sleeping_time(self):
        return 1

    async def match_command(self, event):
        action = event["action"]
        match action:
            case "start":
                if not self.should_run:
                    self.should_run = True
                    asyncio.create_task(self.timer())
            case "stop":
                self.should_run = False

    def update_the_state(self):
        self.state += 1

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"message": event["state"]}))

    async def game_tick(self):
        self.update_the_state()
        await self.channel_layer.group_send(
            self.match_group_name,
            {"type": "state_update", "state": self.state},
        )
