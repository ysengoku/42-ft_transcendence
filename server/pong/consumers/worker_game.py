import asyncio
import logging
import math
import random
from dataclasses import dataclass

from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

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
GAME_TICK_INTERVAL = 1.0 / 30
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

    bumper_1: Bumper
    bumper_2: Bumper
    ball: Ball
    scored_last: int
    someone_scored: bool

    def __init__(self):
        self.bumper_1: Bumper = Bumper(
            *STARTING_BUMPER_1_POS,
            score=0,
            moves_left=False,
            moves_right=False,
            dir_z=1,
            player_id="",
        )
        self.bumper_2: Bumper = Bumper(
            *STARTING_BUMPER_2_POS,
            score=0,
            moves_left=False,
            moves_right=False,
            dir_z=-1,
            player_id="",
        )
        self.ball: Ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))
        self.scored_last: int = BUMPER_1
        self.someone_scored: bool = False

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
        if player_id == self.bumper_1.player_id:
            bumper = self.bumper_1
        elif player_id == self.bumper_2.player_id:
            bumper = self.bumper_2
        else:
            return

        match action:
            case "move_left":
                bumper.moves_left = content
            case "move_right":
                bumper.moves_right = content

    def _reset_ball(self, direction: int):
        self.ball.temporal_speed.x, self.ball.temporal_speed.z = TEMPORAL_SPEED_DEFAULT
        self.ball.x, self.ball.z = STARTING_BALL_POS
        self.ball.velocity.x, self.ball.velocity.z = STARTING_BALL_VELOCITY
        self.ball.velocity.z *= direction

    def _is_collided_with_ball(self, bumper, ball_subtick_z, ball_subtick_x):
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

    def _calculate_new_dir(self, bumper):
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

    def _check_ball_scored(self):
        if self.ball.z >= BUMPER_2_BORDER:
            self.bumper_1.score += 1
            self._reset_ball(-1)
            self.someone_scored = True
        elif self.ball.z <= BUMPER_1_BORDER:
            self.bumper_2.score += 1
            self._reset_ball(1)
            self.someone_scored = True

    def _check_ball_wall_collision(self):
        if self.ball.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF:
            self.ball.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
            self.ball.velocity.x *= -1
        if self.ball.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF:
            self.ball.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
            self.ball.velocity.x *= -1

    def _check_ball_bumper_collision(self, ball_subtick_z, ball_subtick_x):
        if self.ball.velocity.z <= 0 and self._is_collided_with_ball(self.bumper_1, ball_subtick_z, ball_subtick_x):
            self._calculate_new_dir(self.bumper_1)
        elif self.ball.velocity.z > 0 and self._is_collided_with_ball(self.bumper_2, ball_subtick_z, ball_subtick_x):
            self._calculate_new_dir(self.bumper_2)

    def _move_bumpers(self, bumper_subtick):
            if self.bumper_1.moves_left and not self.bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_1.x += bumper_subtick
            if self.bumper_1.moves_right and not self.bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_1.x -= bumper_subtick

            if self.bumper_2.moves_left and not self.bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
                self.bumper_2.x += bumper_subtick
            if self.bumper_2.moves_right and not self.bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
                self.bumper_2.x -= bumper_subtick


    def _move_ball(self, ball_subtick_z, ball_subtick_x):
        self.ball.z += ball_subtick_z * self.ball.velocity.z
        self.ball.x += ball_subtick_x * self.ball.velocity.x

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
            self._check_ball_wall_collision()
            self._check_ball_bumper_collision(ball_subtick_z, ball_subtick_x)
            self._check_ball_scored()
            self._move_bumpers(bumper_subtick)
            self._move_ball(ball_subtick_z, ball_subtick_x)

            current_subtick += 1

    def add_player(self, player_id: str):
        """
        Assigns player to a random bumper.
        """
        available_player_slots = []
        if not self.bumper_1.player_id:
            available_player_slots.append(self.bumper_1)
        if not self.bumper_2.player_id:
            available_player_slots.append(self.bumper_2)
        if not available_player_slots:
            return

        random.shuffle(available_player_slots)
        available_player_slots.pop().player_id = player_id


class GameConsumer(AsyncConsumer):
    def __init__(self):
        super().__init__()
        self.matches = {}
        self.matches_tasks = {}
        self.players = {}
        self.channel_layer = get_channel_layer()
        asyncio.create_task(self.process_matches())

    def _to_group_name(self, game_room_id: str):
        """Little function for avoiding typing errors."""
        return f"game_room_{game_room_id}"

    async def player_connected(self, event):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]
        if game_room_id not in self.players:
            logger.info("[GameWorker]: player was added to game {%s}", game_room_id)
            self.players[game_room_id].append({"player_id": player_id})
            return

        logger.info("[GameWorker]: player was added to game {%s}", game_room_id)
        self.players[game_room_id] = [{"player_id": player_id}]

        if game_room_id in self.matches:
            self.matches[game_room_id].add_player(player_id)
            return

        self.matches[game_room_id] = Pong()
        self.matches[game_room_id].add_player(player_id)
        self.matches_tasks[game_room_id] = asyncio.create_task(self.create_match_loop(game_room_id))

    async def create_match_loop(self, game_room_id: str):
        """Asynchrounous loop that runs one specific match."""
        logger.info("[GameWorker]: match {%s} has started", game_room_id)
        match = self.matches[game_room_id]
        try:
            # TODO: tweak the condition for the running of the game loop
            while True:
                tick_start_time = asyncio.get_event_loop().time()
                match.resolve_next_tick()
                await self.send_state_to_players(game_room_id, match.as_dict())
                tick_end_time = asyncio.get_event_loop().time()
                time_taken_for_current_tick = tick_end_time - tick_start_time
                # tick the game for this match 30 times a second
                asyncio.sleep(max(GAME_TICK_INTERVAL - time_taken_for_current_tick, 0))
        except asyncio.CancelledError as _:
            # TODO: Do something if the task was cancelled.
            pass
        # TODO: do the cleanup logic for the match

    def player_inputed(self, event):
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

    async def send_state_to_players(self, game_room_id: str, state: dict):
        group_name = self._to_group_name(game_room_id)
        self.channel_layer.group_send(group_name, {"type": "state_updated", "state": state})
        self.matches[game_room_id].someone_scored = False
