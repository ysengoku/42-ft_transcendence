import asyncio
import json
import logging
import math
from dataclasses import dataclass

from channels.generic.websocket import AsyncConsumer

logger = logging.getLogger("server")
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
STARTING_BUMPER_1_POS = 0, -9
STARTING_BUMPER_2_POS = 0, 9
STARTING_BALL_POS = 0, 0
Z_VELOCITY = 0.25
STARTING_BALL_VELOCITY = 0, Z_VELOCITY
SUBTICK = 0.05
BOUNCING_ANGLE_DEGREES = 55
BALL_VELOCITY_CAP = 1
TEMPORAL_SPEED_DEFAULT = 1, 1
TEMPORAL_SPEED_INCREASE = SUBTICK * 0
TEMPORAL_SPEED_DECAY = 0.005
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
    player_id: str


@dataclass(slots=True)
class Ball(Vector2):
    velocity: Vector2
    temporal_speed: Vector2


class Pong:
    """
    Stores and modifies the state of the game.
    BUMPER_1 and BUMPER_2 are symbolic constants that represent specific bumpers.
    """

    bumper_1: Bumper = Bumper(
        *STARTING_BUMPER_1_POS,
        score=0,
        moves_left=False,
        moves_right=False,
        dir_z=1,
        player_id="",
    )
    bumper_2: Bumper = Bumper(
        *STARTING_BUMPER_2_POS,
        score=0,
        moves_left=False,
        moves_right=False,
        dir_z=-1,
        player_id="",
    )
    ball: Ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))
    scored_last: int = BUMPER_1
    someone_scored: bool = False

    def as_dict(self):
        return {
            "bumper_1": {"x": self.bumper_1.x, "z": self.bumper_1.z},
            "bumper_2": {"x": self.bumper_2.x, "z": self.bumper_2.z},
            "ball": {
                "x": self.ball.x,
                "z": self.ball.z,
                "velocity": {"x": self.ball.velocity.x, "z": self.ball.velocity.z},
            },
            "scored_last": self.scored_last,
            "someone_scored": self.someone_scored,
        }

    def handle_input(self, player_id: str, action: str, content: bool):
        bumper_map = {
            self.bumper_1.player_id: self.bumper_1,
            self.bumper_2.player_id: self.bumper_2,
        }
        if player_id in bumper_map:
            bumper = bumper_map[player_id]
        else:
            return

        match action:
            case "move_left":
                bumper.moves_left = content
            case "move_left":
                bumper.moves_left = content
            case "move_right":
                bumper.moves_right = content
            case "move_right":
                bumper.moves_right = content

    def reset_ball(self, direction: int):
        self.ball.temporal_speed.x, self.ball.temporal_speed.z = TEMPORAL_SPEED_DEFAULT
        self.ball.x, self.ball.z = STARTING_BALL_POS
        self.ball.velocity.x, self.ball.velocity.z = STARTING_BALL_VELOCITY
        self.ball.velocity.z *= direction

    def calculate_new_dir(self, bumper):
        collision_pos_x = bumper.x - self.ball.x
        normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + BUMPER_LENGTH_HALF)
        bounce_angle_radians = math.radians(BOUNCING_ANGLE_DEGREES * normalized_collision_pos_x)
        self.ball.velocity.z = (
            min(BALL_VELOCITY_CAP, abs(self.ball.velocity.z * 1.025 * self.ball.temporal_speed.z)) * bumper.dir_z
        )
        self.ball.velocity.x = self.ball.velocity.z * -math.tan(bounce_angle_radians) * bumper.dir_z
        self.ball.velocity.x = math.copysign(max(abs(self.ball.velocity.x), 0.05), self.ball.velocity.x)

        collision_pos_z = bumper.z - self.ball.z
        normalized_collision_pos_z = collision_pos_z / (BALL_RADIUS + BUMPER_WIDTH_HALF)
        normalized_collision_pos_z
        if (self.ball.z - BALL_RADIUS * self.ball.velocity.z <= bumper.z + BUMPER_WIDTH_HALF) and (
            self.ball.z + BALL_RADIUS * self.ball.velocity.z >= bumper.z - BUMPER_WIDTH_HALF
        ):
            self.ball.temporal_speed.x += TEMPORAL_SPEED_INCREASE

    def resolve_next_tick(self):
        """
        Moves the objects in the game by one subtick at a time.
        This approach is called Conservative Advancement.
        """
        total_distance_x = abs((self.ball.temporal_speed.x) * self.ball.velocity.x)
        total_distance_z = abs((self.ball.temporal_speed.z) * self.ball.velocity.z)
        self.ball.temporal_speed.x = max(TEMPORAL_SPEED_DEFAULT[0], self.ball.temporal_speed.x - TEMPORAL_SPEED_DECAY)
        self.ball.temporal_speed.z = max(TEMPORAL_SPEED_DEFAULT[1], self.ball.temporal_speed.z - TEMPORAL_SPEED_DECAY)
        current_subtick = 0
        ball_subtick_z = SUBTICK
        total_subticks = total_distance_z / ball_subtick_z
        ball_subtick_x = total_distance_x / total_subticks
        bumper_subtick = BUMPER_SPEED / total_subticks
        while current_subtick <= total_subticks:
            if self.ball.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF:
                self.ball.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
                self.ball.velocity.x *= -1
            if self.ball.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF:
                self.ball.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
                self.ball.velocity.x *= -1

            if self.ball.velocity.z <= 0 and self.is_collided_with_ball(self.bumper_1, ball_subtick_z, ball_subtick_x):
                self.calculate_new_dir(self.bumper_1)
            elif self.ball.velocity.z > 0 and self.is_collided_with_ball(self.bumper_2, ball_subtick_z, ball_subtick_x):
                self.calculate_new_dir(self.bumper_2)

            if self.ball.z >= BUMPER_2_BORDER:
                self.bumper_1.score += 1
                self.reset_ball(-1)
                self.someone_scored = True
            elif self.ball.z <= BUMPER_1_BORDER:
                self.bumper_2.score += 1
                self.reset_ball(1)
                self.someone_scored = True

            if self.bumper_1.moves_left and not self.bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_1.x += bumper_subtick
            if self.bumper_1.moves_right and not self.bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_1.x -= bumper_subtick

            if self.bumper_2.moves_left and not self.bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_2.x += bumper_subtick
            if self.bumper_2.moves_right and not self.bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_2.x -= bumper_subtick

            self.ball.z += ball_subtick_z * self.ball.velocity.z
            self.ball.x += ball_subtick_x * self.ball.velocity.x
            current_subtick += 1

    def is_collided_with_ball(self, bumper, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the bumper which is given as a
        parameter to this function.
        """
        return (
            (self.ball.x - BALL_RADIUS + ball_subtick_x * self.ball.velocity.x <= bumper.x + BUMPER_LENGTH_HALF)
            and (self.ball.x + BALL_RADIUS + ball_subtick_x * self.ball.velocity.x >= bumper.x - BUMPER_LENGTH_HALF)
            and (self.ball.z - BALL_RADIUS + ball_subtick_z * self.ball.velocity.z <= bumper.z + BUMPER_WIDTH_HALF)
            and (self.ball.z + BALL_RADIUS + ball_subtick_z * self.ball.velocity.z >= bumper.z - BUMPER_WIDTH_HALF)
        )


class GameConsumer(AsyncConsumer):
    def __init__(self):
        super().__init__()
        self.matches = {}
        self.players = {}
        asyncio.create_task(self.process_matches())

    async def player_connected(self, event):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]
        if game_room_id not in self.players:
            self.players[game_room_id].append({"player_id": player_id})
            return

        self.players[game_room_id] = [{"player_id": player_id}]

        if game_room_id in self.matches:
            return

        self.matches[game_room_id] = Pong()

    async def player_inputed(self, event):
        """
        Handles player input. There is no validation of the input, because it is a worker,
        and event source is the server, which we can trust.
        """
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]
        action = event["action"]
        content = event["content"]

        match action:
            case "move_left" | "move_right":
                self.matches[game_room_id].handle_input(player_id, action, content)

    async def process_matches(self):
        while True:
            for match in self.matches.values():
                await match.resolve_next_tick()
                await self.channel_layer.group_send(self.match_group_name, {"type": "state_update"})
            await asyncio.sleep(0.015)

    async def state_update(self, event):
        # TODO: properly send the state back to the server
        await self.send(text_data=json.dumps({"event": "game_tick", "state": self.state.as_dict()}))
        self.state.someone_scored = False
