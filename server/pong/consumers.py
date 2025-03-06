import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer

#### CONSTANTS ####
WALL_LEFT_X = 10
WALL_RIGHT_X = -10
WALL_WIDTH_HALF = 0.5
BUMPER_LENGTH_HALF = 2.5
BUMPER_WIDTH = 1
BUMPER_WIDTH_HALF = BUMPER_WIDTH / 2
BALL_DIAMETER = 1
BALL_RADIUS = BALL_DIAMETER / 2
BUMPER_2_BORDER = 9.5
BUMPER_1_BORDER = -9.5
SUBTICK = 0.5
SPEED_CAP = 1
###################

class GameConsumer(AsyncWebsocketConsumer):
    def initialize_or_load_the_state(self):
        self.state = {
            "bumper_1": {
                "x": 0,
                "y": 1,
                "z": -9,
                "score": 0,
                "moves_left": False,
                "moves_right": False,
            },
            "bumper_2": {
                "x": 0,
                "y": 1,
                "z": 9,
                "score": 0,
                "moves_left": False,
                "moves_right": False,
            },
            "scored_last": 1,
        }
        self.reset_ball_state()

    def reset_ball_state(self):
        self.params = {
            "speed_x": 0.05,
            "speed_z": 0.05,
        }
        resetted_ball_state = {
            "ball": {
                "x": 0,
                "y": 3,
                "z": 0,
                "velocity": {"x": 0.5, "z": 0.5},
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

    def change_players_positions(self):
        if (
            self.state["bumper_1"]["moves_left"]
            and not self.state["bumper_1"]["x"] > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF
        ):
            self.state["bumper_1"]["x"] += 0.25
        if (
            self.state["bumper_1"]["moves_right"]
            and not self.state["bumper_1"]["x"] < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF
        ):
            self.state["bumper_1"]["x"] -= 0.25

        if (
            self.state["bumper_2"]["moves_left"]
            and not self.state["bumper_2"]["x"] > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF
        ):
            self.state["bumper_2"]["x"] += 0.25
        if (
            self.state["bumper_2"]["moves_right"]
            and not self.state["bumper_2"]["x"] < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF
        ):
            self.state["bumper_2"]["x"] -= 0.25


    def is_collided_with_ball(self, bumper):
        """
        Calculates rectangle-on-rectangle collision between the ball and the bumper which is given as a
        parameter to this function.
        """
        return (
            (self.state["ball"]["x"] - BALL_RADIUS <= bumper["x"] + BUMPER_LENGTH_HALF)
            and (self.state["ball"]["x"] + BALL_RADIUS >= bumper["x"] - BUMPER_LENGTH_HALF)
            and (self.state["ball"]["z"] - BALL_RADIUS <= bumper["z"] + BUMPER_WIDTH_HALF)
            and (self.state["ball"]["z"] + BALL_RADIUS >= bumper["z"] - BUMPER_WIDTH_HALF)
        )

    def move_ball(self):
        """
        Moves the ball by a single constant subtick at a time in order to avoid collision errors.
        This approach is called Conservative Advancement.
        """
        total_distance_z = abs(self.params["speed_z"] * self.state["ball"]["velocity"]["z"])
        total_distance_x = abs(self.params["speed_x"] * self.state["ball"]["velocity"]["x"])
        current_subtick = 0
        subtick_z = SUBTICK
        total_subticks = total_distance_z / subtick_z
        subtick_x = total_distance_x / total_subticks
        while current_subtick <= total_subticks:
            if (
                self.state["ball"]["x"] <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
                or self.state["ball"]["x"] >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
            ):
                self.state["ball"]["velocity"]["x"] *= -1

            if self.is_collided_with_ball(self.state["bumper_1"]) or self.is_collided_with_ball(self.state["bumper_2"]):
                self.params["speed_z"] = min(SPEED_CAP, self.params["speed_z"] + SUBTICK)
                self.state["ball"]["velocity"]["z"] *= -1
                self.state["ball"]["velocity"]["x"] *= -1

            if self.state["ball"]["z"] >= BUMPER_2_BORDER:
                self.state["bumper_1"]["score"] += 1
                self.reset_ball_state()
                self.state["ball"]["velocity"]["z"] = -1
            elif self.state["ball"]["z"] <= BUMPER_1_BORDER:
                self.state["bumper_2"]["score"] += 1
                self.reset_ball_state()
                self.state["ball"]["velocity"]["z"] = 1

            self.state["ball"]["z"] += subtick_z * self.state["ball"]["velocity"]["z"]
            self.state["ball"]["x"] += subtick_x * self.state["ball"]["velocity"]["x"]
            current_subtick += 1


    def update_the_state(self):
        self.change_players_positions()
        self.move_ball()

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"state": event["state"]}))

    async def game_tick(self):
        self.update_the_state()
        await self.channel_layer.group_send(self.match_group_name, {"type": "state_update", "state": self.state})
