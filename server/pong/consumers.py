import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer

WALL_LEFT_X = 6.75
WALL_RIGHT_X = -WALL_LEFT_X
BUMPER_2_BORDER = 10
BUMPER_1_BORDER = -BUMPER_2_BORDER
SPEED_CAP = 30

class GameConsumer(AsyncWebsocketConsumer):
    # TODO: wall collision
    # TODO: bumper collision
    def initialize_or_load_the_state(self):
        self.state = {
            "bumper_1": {
                "x": 0,
                "y": 1,
                "z": 9,
                "score": 0,
                "moves_left": False,
                "moves_right": False,
            },
            "bumper_2": {
                "x": 0,
                "y": 1,
                "z": -9,
                "score": 0,
                "moves_left": False,
                "moves_right": False,
            },
            "scored_last": 1,
        }
        self.reset_ball_state()

    def reset_ball_state(self):
        self.params = {
            "speed_x": 0.1,
            "speed_z": 0.1,
        }
        resetted_ball_state = {
            "ball": {
                "x": 0,
                "y": 3,
                "z": 0,
                "velocity": {"x": 1, "z": 1},
                "has_collided_with_bumper_1": False,
                "has_collided_with_bumper_2": False,
                "has_collided_with_wall": False,
            },
        }
        self.state = self.state | resetted_ball_state

    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)

        await self.accept()

        self.initialize_or_load_the_state()
        await self.send(text_data=json.dumps({"state": self.state}))
        self.should_run = True
        asyncio.create_task(self.timer())

    async def disconnect(self, close_code):
        self.should_run = False
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        match action:
            case "bumper1_move_left":
                self.state["bumper_1"]["moves_left"] = text_data_json["content"]
            case "bumper2_move_left":
                self.state["bumper_2"]["moves_left"] = text_data_json["content"]
            case "bumper1_move_right":
                self.state["bumper_1"]["moves_right"] = text_data_json["content"]
            case "bumper2_move_right":
                self.state["bumper_2"]["moves_right"] = text_data_json["content"]

    def calculate_sleeping_time(self):
        return 0.015

    def update_the_state(self):
        if self.state["bumper_1"]["moves_left"] and not self.state["bumper_1"]["x"] > WALL_LEFT_X:
            self.state["bumper_1"]["x"] += 0.25
        if self.state["bumper_1"]["moves_right"] and not self.state["bumper_1"]["x"] < WALL_RIGHT_X:
            self.state["bumper_1"]["x"] -= 0.25

        if self.state["bumper_2"]["moves_left"] and not self.state["bumper_2"]["x"] > WALL_LEFT_X:
            self.state["bumper_2"]["x"] += 0.25
        if self.state["bumper_2"]["moves_right"] and not self.state["bumper_2"]["x"] < WALL_RIGHT_X:
            self.state["bumper_2"]["x"] -= 0.25

        if self.state["ball"]["x"] <= WALL_RIGHT_X - 2.25 or self.state["ball"]["x"] >= WALL_LEFT_X + 2.25:
           self.state["ball"]["velocity"]["x"] *= -1

        if self.state["ball"]["z"] >= BUMPER_2_BORDER:
            self.state["bumper_1"]["score"] += 1
            self.reset_ball_state()
            self.state["ball"]["velocity"]["z"] = -1
        elif self.state["ball"]["z"] <= BUMPER_1_BORDER:
            self.state["bumper_2"]["score"] += 1
            self.reset_ball_state()
            self.state["ball"]["velocity"]["z"] = 1

        self.state["ball"]["z"] += self.params["speed_z"] * self.state["ball"]["velocity"]["z"]
        self.state["ball"]["x"] += self.params["speed_x"] * self.state["ball"]["velocity"]["x"]
        self.params["speed_z"] += 0.001
        self.params["speed_z"] = min(SPEED_CAP, self.params["speed_z"])

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"state": event["state"]}))

    async def game_tick(self):
        self.update_the_state()
        await self.channel_layer.group_send(self.match_group_name, {"type": "state_update", "state": self.state})
