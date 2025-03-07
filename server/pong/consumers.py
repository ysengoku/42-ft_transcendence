import asyncio
import json
import pdb

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
BUMPER_2_BORDER = 10
BUMPER_1_BORDER = -10
SUBTICK = 0.05
SPEED_CAP = 50
BUMPER_SPEED = 0.25
###################

class Vector2:
    x: float
    z: float

    def __init__(self, x, z):
        self.x, self.z = x, z


class Bumper:
    STARTING_BUMPER_1_POS = 0, 9
    STARTING_BUMPER_2_POS = 0, -9
    pos: Vector2 = Vector2(0, 0)
    score: int
    moves_left: bool
    moves_right: bool

    def __init__(self, x, z):
        self.pos.x, self.pos.z = x, z


class Ball:
    STARTING_POS = 0, 0
    DEFAULT_SPEED = 0.1
    pos: Vector2 = Vector2(*STARTING_POS)
    speed_x: float = DEFAULT_SPEED
    speed_z: float = DEFAULT_SPEED

    def reset_state(self):
        self.speed_x, self.speed_z = Ball.DEFAULT_SPEED, Ball.DEFAULT_SPEED
        self.pos = Vector2(*Ball.STARTING_POS)


class State:
    bumper_1: Bumper = Bumper(*Bumper.STARTING_BUMPER_1_POS)
    bumper_2: Bumper = Bumper(*Bumper.STARTING_BUMPER_1_POS)
    ball: Ball = Ball(0.1, 0.1)
    scored_last: int = 1


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
        self.scored = False

    def reset_ball_state(self):
        self.params = {
            "speed_x": 0.1,
            "speed_z": 0.1,
        }
        resetted_ball_state = {
            "ball": {
                "x": 0,
                "y": 3,
                "z": 8,
                "velocity": {"x": 0, "z": -1},
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

    def calculate_new_velocity(self, bumper):
        self.params["speed_z"] = min(SPEED_CAP, self.params["speed_z"] + SUBTICK)
        self.state["ball"]["velocity"]["x"] *= -1
        self.state["ball"]["velocity"]["z"] *= -1

    def is_collided_with_ball(self, bumper, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the bumper which is given as a
        parameter to this function.
        """
        return (
            (
                self.state["ball"]["x"] - BALL_RADIUS + ball_subtick_x * self.state["ball"]["velocity"]["x"]
                <= bumper["x"] + BUMPER_LENGTH_HALF
            )
            and (
                self.state["ball"]["x"] + BALL_RADIUS + ball_subtick_x * self.state["ball"]["velocity"]["x"]
                >= bumper["x"] - BUMPER_LENGTH_HALF
            )
            and (
                self.state["ball"]["z"] - BALL_RADIUS + ball_subtick_z * self.state["ball"]["velocity"]["z"]
                <= bumper["z"] + BUMPER_WIDTH_HALF
            )
            and (
                self.state["ball"]["z"] + BALL_RADIUS + ball_subtick_z * self.state["ball"]["velocity"]["z"]
                >= bumper["z"] - BUMPER_WIDTH_HALF
            )
        )

    def resolve_movement(self):
        """
        Moves the ball by a single constant subtick at a time in order to avoid collision errors.
        This approach is called Conservative Advancement.
        """
        total_distance_z = abs(self.params["speed_z"] * self.state["ball"]["velocity"]["z"])
        total_distance_x = abs(self.params["speed_x"] * self.state["ball"]["velocity"]["x"])
        current_subtick = 0
        ball_subtick_z = SUBTICK
        total_subticks = total_distance_z / ball_subtick_z
        ball_subtick_x = total_distance_x / total_subticks
        bumper_subtick = BUMPER_SPEED / total_subticks
        while current_subtick <= total_subticks:
            # pdb.set_trace()
            if (
                self.state["ball"]["x"] <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
                or self.state["ball"]["x"] >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
            ):
                self.state["ball"]["velocity"]["x"] *= -1

            if self.is_collided_with_ball(self.state["bumper_1"], ball_subtick_z, ball_subtick_x):
                self.calculate_new_velocity(self.state["bumper_1"])
            elif self.is_collided_with_ball(self.state["bumper_2"], ball_subtick_z, ball_subtick_x):
                self.calculate_new_velocity(self.state["bumper_2"])

            if self.state["ball"]["z"] >= BUMPER_2_BORDER:
                self.state["bumper_1"]["score"] += 1
                self.reset_ball_state()
                self.state["ball"]["velocity"]["z"] = -1
                self.scored = True
            elif self.state["ball"]["z"] <= BUMPER_1_BORDER:
                self.state["bumper_2"]["score"] += 1
                self.reset_ball_state()
                self.state["ball"]["velocity"]["z"] = 1
                self.scored = True

            if (
                self.state["bumper_1"]["moves_left"]
                and not self.state["bumper_1"]["x"] > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF
            ):
                self.state["bumper_1"]["x"] += bumper_subtick
            if (
                self.state["bumper_1"]["moves_right"]
                and not self.state["bumper_1"]["x"] < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF
            ):
                self.state["bumper_1"]["x"] -= bumper_subtick

            if (
                self.state["bumper_2"]["moves_left"]
                and not self.state["bumper_2"]["x"] > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF
            ):
                self.state["bumper_2"]["x"] += bumper_subtick
            if (
                self.state["bumper_2"]["moves_right"]
                and not self.state["bumper_2"]["x"] < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF
            ):
                self.state["bumper_2"]["x"] -= bumper_subtick

            self.state["ball"]["z"] += ball_subtick_z * self.state["ball"]["velocity"]["z"]
            self.state["ball"]["x"] += ball_subtick_x * self.state["ball"]["velocity"]["x"]
            current_subtick += 1

    def update_the_state(self):
        self.resolve_movement()

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        if self.scored:
            await self.send(text_data=json.dumps({"state": event["state"], "scored": "yes"}))
            self.scored = False
        else:
            await self.send(text_data=json.dumps({"state": event["state"]}))

    async def game_tick(self):
        self.update_the_state()
        await self.channel_layer.group_send(self.match_group_name, {"type": "state_update", "state": self.state})
