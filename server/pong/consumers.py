import asyncio
import json
import math
from dataclasses import dataclass

from channels.generic.websocket import AsyncWebsocketConsumer

#### CONSTANTS ####
BUMPER_1 = 1
BUMPER_2 = 2
WALL_LEFT_X = 10
WALL_RIGHT_X = -WALL_LEFT_X
WALL_WIDTH_HALF = 0.5
BUMPER_LENGTH_HALF = 2.5
BUMPER_WIDTH = 1
BUMPER_WIDTH_HALF = BUMPER_WIDTH / 2
BUMPER_1_BORDER = -10
BUMPER_2_BORDER = -BUMPER_1_BORDER
BUMPER_SPEED = 0.25
BALL_DIAMETER = 1
BALL_RADIUS = BALL_DIAMETER / 2
BALL_SPEED_CAP = 50
STARTING_BUMPER_1_POS = 0, -9
STARTING_BUMPER_2_POS = 0, 9
STARTING_BALL_SPEED = 0.1, 0.1
STARTING_BALL_POS = 0, 8
STARTING_BALL_DIR = 0, 1
SUBTICK = 0.05
BOUNCING_ANGLE_DEGREES = 55
###################


@dataclass(slots=True)
class Vector2:
    x: float
    z: float


@dataclass(slots=True)
class Bumper(Vector2):
    score: int
    moves_left: bool
    moves_right: bool
    dir_z: int


@dataclass(slots=True)
class Ball(Vector2):
    speed: Vector2
    dir: Vector2
    temporal_speed: Vector2


class Pong:
    """
    Stores and modifies the state of the game.
    BUMPER_1 and BUMPER_2 are symbolic constants that represent specific bumpers.
    """

    bumper_1: Bumper = Bumper(*STARTING_BUMPER_1_POS, score=0, moves_left=False, moves_right=False, dir_z=1)
    bumper_2: Bumper = Bumper(*STARTING_BUMPER_2_POS, score=0, moves_left=False, moves_right=False, dir_z=-1)
    ball: Ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_SPEED), Vector2(*STARTING_BALL_DIR), Vector2(0, 0))
    scored_last: int = BUMPER_1
    someone_scored: bool = False

    def as_dict(self):
        return {
            "bumper_1": {"x": self.bumper_1.x, "z": self.bumper_1.z},
            "bumper_2": {"x": self.bumper_2.x, "z": self.bumper_2.z},
            "ball": {
                "x": self.ball.x,
                "z": self.ball.z,
                "velocity": {"x": self.ball.dir.x, "z": self.ball.dir.z},
            },
            "scored_last": self.scored_last,
            "someone_scored": self.someone_scored,
        }

    def receive_input(self, action: str, content: bool):
        match action:
            case "bumper1_move_left":
                self.bumper_1.moves_left = content
            case "bumper2_move_left":
                self.bumper_2.moves_left = content
            case "bumper1_move_right":
                self.bumper_1.moves_right = content
            case "bumper2_move_right":
                self.bumper_2.moves_right = content

    def reset_ball(self):
        self.ball.speed.x, self.ball.speed.z = STARTING_BALL_SPEED
        self.ball.temporal_speed.x, self.ball.temporal_speed.z = 0, 0
        self.ball.x, self.ball.z = STARTING_BALL_POS
        self.ball.dir.x, self.ball.dir.z = STARTING_BALL_DIR

    def calculate_new_dir(self, bumper):
        self.ball.speed.z = min(BALL_SPEED_CAP, self.ball.speed.z + SUBTICK)
        collision_pos_x = bumper.x - self.ball.x
        normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + BUMPER_LENGTH_HALF)
        radians = math.radians(BOUNCING_ANGLE_DEGREES * normalized_collision_pos_x)
        self.ball.dir.x = -math.sin(radians)
        self.ball.dir.z = math.cos(radians) * bumper.dir_z

        collision_pos_z = bumper.z - self.ball.z
        normalized_collision_pos_z = collision_pos_z / (BALL_RADIUS + BUMPER_WIDTH_HALF)
        normalized_collision_pos_z
        if ((self.ball.z - BALL_RADIUS * self.ball.dir.z <= bumper.z + BUMPER_WIDTH_HALF) and
            (self.ball.z + BALL_RADIUS * self.ball.dir.z >= bumper.z - BUMPER_WIDTH_HALF)):
                self.ball.temporal_speed.x += SUBTICK * 5

    def resolve_next_tick(self):
        """
        Moves the objects in the game by one subtick at a time.
        This approach is called Conservative Advancement.
        """
        total_distance_x = abs((self.ball.speed.x + self.ball.temporal_speed.x) * self.ball.dir.x)
        total_distance_z = abs((self.ball.speed.z + self.ball.temporal_speed.z) * self.ball.dir.z)
        self.ball.temporal_speed.x = max(0, self.ball.temporal_speed.x - SUBTICK)
        self.ball.temporal_speed.z = max(0, self.ball.temporal_speed.z - SUBTICK)
        current_subtick = 0
        ball_subtick_z = SUBTICK
        total_subticks = total_distance_z / ball_subtick_z
        ball_subtick_x = total_distance_x / total_subticks
        bumper_subtick = BUMPER_SPEED / total_subticks
        while current_subtick <= total_subticks:
            if  self.ball.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF:
                self.ball.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
                self.ball.dir.x *= -1
            if self.ball.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF:
                self.ball.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
                self.ball.dir.x *= -1

            if self.ball.dir.z <= 0 and self.is_collided_with_ball(self.bumper_1, ball_subtick_z, ball_subtick_x):
                self.calculate_new_dir(self.bumper_1)
            elif self.ball.dir.z > 0 and self.is_collided_with_ball(self.bumper_2, ball_subtick_z, ball_subtick_x):
                self.calculate_new_dir(self.bumper_2)

            if self.ball.z >= BUMPER_2_BORDER:
                self.bumper_1.score += 1
                self.reset_ball()
                self.ball.dir.z = -1
                self.someone_scored = True
            elif self.ball.z <= BUMPER_1_BORDER:
                self.bumper_2.score += 1
                self.reset_ball()
                self.ball.dir.z = 1
                self.someone_scored = True

            if self.bumper_1.moves_left and not self.bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_1.x += bumper_subtick
            if self.bumper_1.moves_right and not self.bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_1.x -= bumper_subtick

            if self.bumper_2.moves_left and not self.bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_2.x += bumper_subtick
            if self.bumper_2.moves_right and not self.bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_2.x -= bumper_subtick

            self.ball.z += ball_subtick_z * self.ball.dir.z
            self.ball.x += ball_subtick_x * self.ball.dir.x
            current_subtick += 1

    def is_collided_with_ball(self, bumper, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the bumper which is given as a
        parameter to this function.
        """
        return (
            (self.ball.x - BALL_RADIUS + ball_subtick_x * self.ball.dir.x <= bumper.x + BUMPER_LENGTH_HALF)
            and (self.ball.x + BALL_RADIUS + ball_subtick_x * self.ball.dir.x >= bumper.x - BUMPER_LENGTH_HALF)
            and (self.ball.z - BALL_RADIUS + ball_subtick_z * self.ball.dir.z <= bumper.z + BUMPER_WIDTH_HALF)
            and (self.ball.z + BALL_RADIUS + ball_subtick_z * self.ball.dir.z >= bumper.z - BUMPER_WIDTH_HALF)
        )


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)

        await self.accept()

        self.state = Pong()
        await self.send(text_data=json.dumps({"state": self.state.as_dict()}))
        self.should_run = True
        asyncio.create_task(self.timer())

    async def disconnect(self, close_code):
        self.should_run = False
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action, content = text_data_json["action"], text_data_json["content"]
        self.state.receive_input(action, content)

    def calculate_sleeping_time(self):
        return 0.015

    async def timer(self):
        while self.should_run:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"state": self.state.as_dict()}))
        self.state.someone_scored = False

    async def game_tick(self):
        self.state.resolve_next_tick()
        await self.channel_layer.group_send(self.match_group_name, {"type": "state_update"})
