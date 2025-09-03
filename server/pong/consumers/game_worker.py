import asyncio
import contextlib
import logging
import math
import random
import traceback
from dataclasses import dataclass
from enum import Enum, IntEnum, auto
from typing import Literal

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

from common.close_codes import CloseCodes
from pong.game_protocol import (
    GameRoomSettings,
    GameServerToClient,
    GameServerToGameWorker,
    SerializedGameState,
)
from pong.models import GameRoom, Match
from tournaments.models import Bracket

logger = logging.getLogger("server")
logging.getLogger("asyncio").setLevel(logging.WARNING)
#### CONSTANTS ####
# FRAME RATE
GAME_TICK_INTERVAL = 1.0 / 30

# GEOMETRIC CONSTANTS
WALL_LEFT_X = 10
WALL_RIGHT_X = -WALL_LEFT_X
WALL_WIDTH_HALF = 0.5
BUMPER_LENGTH_HALF = 2.5
BUMPER_WIDTH = 1
BUMPER_WIDTH_HALF = BUMPER_WIDTH / 2
BUMPER_1_BORDER = -10
BUMPER_2_BORDER = -BUMPER_1_BORDER
COIN_LENGTH_HALF = 0.25
COIN_WIDTH_HALF = 0.05
BALL_DIAMETER = 1
BALL_RADIUS = BALL_DIAMETER / 2
STARTING_BUMPER_1_POS = 0, -9
STARTING_COIN_POS = -9.25, 1
HIDDEN_COIN_SPOT = -100
STARTING_BUMPER_2_POS = 0, 9
STARTING_BALL_POS = 0, 0
BOUNCING_ANGLE_DEGREES = 55
PLAYERS_REQUIRED = 2
DEFAULT_COIN_WAIT_TIME = 30

# SPEED VALUES IN UNITS PER SECOND (original working values)
BUMPER_SPEED_PER_SECOND = 15.0
BALL_Z_VELOCITY_PER_SECOND = 15.0
COIN_VELOCITY_PER_SECOND = 3.0, 0
BALL_VELOCITY_CAP_PER_SECOND = 75.0
TEMPORAL_SPEED_DECAY_PER_SECOND = 0.25

# BUFF DURATIONS IN SECONDS
CONTROL_REVERSE_ENEMY_DURATION = 15
SPEED_DECREASE_ENEMY_DURATION = 15
SHORTEN_ENEMY_DURATION = 15
ELONGATE_PLAYER_DURATION = 15
ENLARGE_PLAYER_DURATION = 15

# DIRECT VALUES (units per second - no conversion needed)
BASE_BUMPER_SPEED = BUMPER_SPEED_PER_SECOND
STARTING_COIN_VELOCITY = COIN_VELOCITY_PER_SECOND
STARTING_BALL_VELOCITY = 0, BALL_Z_VELOCITY_PER_SECOND
BALL_VELOCITY_CAP = BALL_VELOCITY_CAP_PER_SECOND
TEMPORAL_SPEED_DECAY = TEMPORAL_SPEED_DECAY_PER_SECOND

# MULTIPLIERS
TEMPORAL_SPEED_DEFAULT = 1, 1
TEMPORAL_SPEED_INCREASE = 0  # currently unused
###################

logger.debug(
    "Game worker has been started:\n"
    "  GAME_TICK_INTERVAL: %f\n"
    "  BASE_BUMPER_SPEED: %.6f\n"
    "  STARTING_COIN_VELOCITY: %s\n"
    "  STARTING_BALL_VELOCITY: %s",
    GAME_TICK_INTERVAL,
    BASE_BUMPER_SPEED,
    STARTING_COIN_VELOCITY,
    STARTING_BALL_VELOCITY,
)


class MultiplayerPongMatchStatus(Enum):
    PENDING = auto()
    ONGOING = auto()
    PAUSED = auto()
    FINISHED = auto()


class Buff(IntEnum):
    NO_BUFF = 0
    CONTROL_REVERSE_ENEMY = auto()
    SPEED_DECREASE_ENEMY = auto()
    SHORTEN_ENEMY = auto()
    ELONGATE_PLAYER = auto()
    ENLARGE_PLAYER = auto()
    SPAWN_COIN = auto()

    def get_duration_seconds(self) -> float:
        """Get the duration in seconds for this buff type."""
        match self:
            case Buff.CONTROL_REVERSE_ENEMY:
                return CONTROL_REVERSE_ENEMY_DURATION
            case Buff.SPEED_DECREASE_ENEMY:
                return SPEED_DECREASE_ENEMY_DURATION
            case Buff.SHORTEN_ENEMY:
                return SHORTEN_ENEMY_DURATION
            case Buff.ELONGATE_PLAYER:
                return ELONGATE_PLAYER_DURATION
            case Buff.ENLARGE_PLAYER:
                return ENLARGE_PLAYER_DURATION
            case _:
                return 0.0


class CollisionType(Enum):
    WALL = auto()
    BUMPER = auto()
    COIN = auto()
    SCORE = auto()


class PlayerConnectionState(Enum):
    NOT_CONNECTED = auto()
    CONNECTED = auto()
    DISCONNECTED = auto()


@dataclass(slots=True)
class Vector2:
    x: float
    z: float

    def mul(self, nbr: float):
        self.x *= nbr
        self.z *= nbr
        return self


@dataclass(slots=True)
class Bumper(Vector2):
    dir_z: int
    width_half: float = 0.5
    lenght_half: float = 2.5
    score: int = 0
    speed: float = BASE_BUMPER_SPEED
    control_reversed: bool = False
    moves_left: bool = False
    moves_right: bool = False


@dataclass
class Player:
    bumper: Bumper
    id: str = ""
    connection: PlayerConnectionState = PlayerConnectionState.NOT_CONNECTED
    connection_stamp: float = 0.0
    reconnection_time: int = 30
    reconnection_timer: asyncio.Task | None = None
    profile_id: int = -1
    name: str = ""
    avatar: str = ""
    elo: int = 0

    def stop_waiting_for_reconnection_timer(self):
        task = self.reconnection_timer
        if task and not task.cancelled():
            task.cancel()
        self.reconnection_timer = None

    def as_dict(self, anonymous: bool = False):
        if anonymous:
            return {
                "alias": self.name,
                "avatar": self.avatar,
                "player_number": 1 if self.bumper.z == 1 else 2,
            }
        return {
            "name": self.name,
            "avatar": self.avatar,
            "elo": self.elo,
            "player_number": 1 if self.bumper.z == 1 else 2,
        }

    def set_as_connected(self, connection_timestamp: float):
        self.connection = PlayerConnectionState.CONNECTED
        self.connection_stamp = connection_timestamp
        return self


@dataclass(slots=True)
class Coin(Vector2):
    velocity: Vector2


@dataclass(slots=True)
class Ball(Vector2):
    velocity: Vector2
    temporal_speed: Vector2


class BasePong:
    """
    Pong engine. Stores, advances and modifies the state of the game.
    It's the base class designed to be pure and not coupled with the code related to async or Django channels.
    Can be plugged into any engine like PyGame.
    """

    start_time: float
    _game_speed: Literal[0.75, 1.0, 1.25]
    _is_someone_scored: bool
    _bumper_1: Bumper
    _bumper_2: Bumper
    _ball: Ball
    _coin: Coin | None
    _last_bumper_collided: Bumper | None
    _active_buff_or_debuff: Buff
    _last_coin_spawn_time: float
    _active_buff_or_debuff_start_time: float  # in seconds
    _active_buff_or_debuff_target: Bumper | None
    _serialized_state: SerializedGameState

    def __init__(self, cool_mode: bool, game_speed: Literal[0.75, 1.0, 1.25], start_time: float):
        self.start_time = start_time
        self._game_speed = game_speed
        if cool_mode:
            self._coin = Coin(
                *STARTING_COIN_POS,
                Vector2(*STARTING_COIN_VELOCITY).mul(self._game_speed),
            )
        else:
            self._coin = None
        self._is_someone_scored = False
        self._last_bumper_collided = None
        self._active_buff_or_debuff = Buff.NO_BUFF

        self._last_coin_hit_time = start_time
        self._active_buff_or_debuff_start_time = 0.0
        self._active_buff_or_debuff_target = None

        # pre-create the base state dictionary to avoid creating it every tick
        self._serialized_state = {
            "bumper_1": {"x": 0.0, "z": 0.0, "score": 0},
            "bumper_2": {"x": 0.0, "z": 0.0, "score": 0},
            "ball": {"x": 0.0, "z": 0.0, "velocity": {"x": 0.0, "z": 0.0}, "temporal_speed": {"x": 0.0, "z": 0.0}},
            "coin": {"x": 0.0, "z": 0.0} if cool_mode else None,
            "is_someone_scored": False,
            "last_bumper_collided": "_bumper_1",
            "current_buff_or_debuff": int(Buff.NO_BUFF),
            "current_buff_or_debuff_remaining_time": 0.0,
            "current_buff_or_debuff_target": None,
            "remaining_time": 0,
            "time_limit_reached": False,
        }
        self._bumper_1 = Bumper(
            *STARTING_BUMPER_1_POS,
            dir_z=1,
            speed=BASE_BUMPER_SPEED * self._game_speed,
        )
        self._bumper_2 = Bumper(
            *STARTING_BUMPER_2_POS,
            dir_z=-1,
            speed=BASE_BUMPER_SPEED * self._game_speed,
        )
        self._ball = Ball(
            *STARTING_BALL_POS,
            Vector2(*STARTING_BALL_VELOCITY),
            Vector2(*TEMPORAL_SPEED_DEFAULT),
        )

    # tuple of:
    # - type of entity with which ball collided
    # - bumper that caused collision or scored, if it was a coin or a wall then it's `None`
    CollisionInfoWall = tuple[CollisionType.WALL, None]
    CollisionInfoBumper = tuple[CollisionType.BUMPER, Bumper]
    CollisionInfoScore = tuple[CollisionType.SCORE, Bumper]
    CollisionInfoCoin = tuple[CollisionType.COIN, None]
    CollisionInfo = CollisionInfoWall | CollisionInfoBumper | CollisionInfoScore | CollisionInfoCoin

    def resolve_next_tick(self, delta_time: float, current_time: float):
        """
        Calculates movement and collisions for the next tick.
        Uses continuous collision detection for exact collision times.
        """
        self._is_someone_scored = False

        decay_amount = TEMPORAL_SPEED_DECAY * delta_time
        self._ball.temporal_speed.x = max(TEMPORAL_SPEED_DEFAULT[0], self._ball.temporal_speed.x - decay_amount)
        self._ball.temporal_speed.z = max(TEMPORAL_SPEED_DEFAULT[1], self._ball.temporal_speed.z - decay_amount)

        remaining_time = delta_time
        # epsilon is the level of imprecision we are willing to tolerate, it's 0.000001
        epsilon = 1e-6
        while remaining_time > epsilon:
            collision_time, collision_info = self._find_next_collision(remaining_time)

            if collision_info is None:
                # no collision, so we just move objects
                # no further subticks
                self._move_all_objects(remaining_time)
                break

            # this is collision :0 move objects and handle it
            # calculation detection calculates that collision will happen at the `collision_time`
            # so we move the objects -> collision happens -> we handle collision!
            # and then the next subtick happens and we move objects again
            # when there is a collision, there are always subticks btw
            self._move_all_objects(collision_time)
            self._handle_collision(collision_info, current_time)
            remaining_time -= collision_time

        # Handle coin spawning and buff expiration after all movement/collisions
        self._update_coin_and_buffs(current_time)

    def set_ball_to_max_speed(self) -> None:
        current_speed = (self._ball.velocity.x**2 + self._ball.velocity.z**2) ** 0.5
        speed_multiplier = BALL_VELOCITY_CAP_PER_SECOND / current_speed
        self._ball.velocity.x *= speed_multiplier
        self._ball.velocity.z *= speed_multiplier

    ##### Private game logic functions where actual stuff happens. #####
    def _find_next_collision(self, max_time: float) -> tuple[float, CollisionInfo | None]:
        """
        Find the earliest collision within max_time using analytical collision detection.
        Returns (collision_time, collision_info) or (max_time, None) if no collision.
        """
        earliest_time = max_time
        collision_info = None

        ball_vel_x = self._ball.velocity.x * self._ball.temporal_speed.x * self._game_speed
        ball_vel_z = self._ball.velocity.z * self._ball.temporal_speed.z * self._game_speed

        # ball vs left wall
        if ball_vel_x < 0:
            wall_x = WALL_RIGHT_X + WALL_WIDTH_HALF
            t = (wall_x + BALL_RADIUS - self._ball.x) / ball_vel_x
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: left wall - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f",
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                )
                earliest_time = t
                collision_info = (CollisionType.WALL, None)

        # ball vs right wall
        if ball_vel_x > 0:
            wall_x = WALL_LEFT_X - WALL_WIDTH_HALF
            t = (wall_x - BALL_RADIUS - self._ball.x) / ball_vel_x
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: right wall - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f",
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                )
                earliest_time = t
                collision_info = (CollisionType.WALL, None)

        # ball vs bumpers
        for bumper, name in [(self._bumper_1, "bumper_1"), (self._bumper_2, "bumper_2")]:
            t = self._calculate_rectangle_collision_time(
                self._ball.x,
                self._ball.z,
                ball_vel_x,
                ball_vel_z,
                bumper.x,
                bumper.z,
                bumper.lenght_half,
                bumper.width_half,
            )
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: %s - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f, bumper.x=%f",
                    name,
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                    bumper.x,
                )
                earliest_time = t
                collision_info = (CollisionType.BUMPER, bumper)

        # ball vs coin
        if self._coin and self._is_coin_on_screen():
            t = self._calculate_rectangle_collision_time(
                self._ball.x,
                self._ball.z,
                ball_vel_x,
                ball_vel_z,
                self._coin.x,
                self._coin.z,
                COIN_LENGTH_HALF,
                COIN_WIDTH_HALF,
            )
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: coin - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f",
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                )
                earliest_time = t
                collision_info = (CollisionType.COIN, None)

        # ball vs scoring zones
        # SCOOOOORE for bumperino uno
        if ball_vel_z > 0:
            t = (BUMPER_2_BORDER - self._ball.z) / ball_vel_z
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: score! - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f, bumper_2.x=%f",
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                    self._bumper_2.x,
                )
                earliest_time = t
                collision_info = (CollisionType.SCORE, self._bumper_1)

        # SCOOOOORE for bumperino dos
        if ball_vel_z < 0:
            t = (BUMPER_1_BORDER - self._ball.z) / ball_vel_z
            if 0 < t <= earliest_time:
                logger.debug(
                    "COLLISION: score! - t=%f, earliest_time=%f, ball.x=%f, ball.z=%f, bumper_1.x=%f",
                    t,
                    earliest_time,
                    self._ball.x,
                    self._ball.z,
                    self._bumper_1.x,
                )
                earliest_time = t
                collision_info = (CollisionType.SCORE, self._bumper_2)

        return earliest_time, collision_info

    def _calculate_rectangle_collision_time(
        self,
        ball_x,
        ball_z,
        vel_x,
        vel_z,
        rect_x,
        rect_z,
        half_width,
        half_height,
    ) -> float:
        """
        Used for calculating ball vs bumper/coin collision.
        Returns infinity if there are no collisions.
        """
        # sides of bumper or coin
        left = rect_x - half_width - BALL_RADIUS
        right = rect_x + half_width + BALL_RADIUS
        top = rect_z + half_height + BALL_RADIUS
        bottom = rect_z - half_height - BALL_RADIUS

        if vel_x == 0:
            if ball_x < left or ball_x > right:
                return float("inf")
            t_x_enter, t_x_exit = 0, float("inf")
        else:
            t_x_1 = (left - ball_x) / vel_x
            t_x_2 = (right - ball_x) / vel_x
            t_x_enter = min(t_x_1, t_x_2)
            t_x_exit = max(t_x_1, t_x_2)

        if vel_z == 0:
            if ball_z < bottom or ball_z > top:
                return float("inf")
            t_z_enter, t_z_exit = 0, float("inf")
        else:
            t_z_1 = (bottom - ball_z) / vel_z
            t_z_2 = (top - ball_z) / vel_z
            t_z_enter = min(t_z_1, t_z_2)
            t_z_exit = max(t_z_1, t_z_2)

        # collision occurs when both x and z ranges overlap
        collision_enter = max(t_x_enter, t_z_enter)
        collision_exit = min(t_x_exit, t_z_exit)

        if collision_enter <= collision_exit and collision_enter > 0:
            return collision_enter

        return float("inf")

    def _move_all_objects(self, delta_time):
        """Move all objects by `delta_time`."""
        # move ball
        ball_vel_x = self._ball.velocity.x * self._ball.temporal_speed.x * self._game_speed
        ball_vel_z = self._ball.velocity.z * self._ball.temporal_speed.z * self._game_speed
        self._ball.x += ball_vel_x * delta_time
        self._ball.z += ball_vel_z * delta_time

        # move bumpers
        self._move_bumper(self._bumper_1, delta_time)
        self._move_bumper(self._bumper_2, delta_time)

        # move coin (with bouncing :3)
        if self._coin and self._is_coin_on_screen():
            self._coin.x += self._coin.velocity.x * delta_time
            self._coin.z += self._coin.velocity.z * delta_time
            if (self._coin.x < WALL_RIGHT_X + WALL_WIDTH_HALF + COIN_LENGTH_HALF) or (
                self._coin.x > WALL_LEFT_X - WALL_WIDTH_HALF - COIN_LENGTH_HALF
            ):
                self._coin.velocity.x *= -1

    def _move_bumper(self, bumper, delta_time):
        """Move a bumper with wall collision detection."""
        if bumper.moves_left and bumper.moves_right:
            return

        movement = 0
        if bumper.moves_left:
            movement = bumper.speed * delta_time
        elif bumper.moves_right:
            movement = -bumper.speed * delta_time

        # don't go over walls
        # when bumper goes overl wall, it sticks to its edge instead
        new_x = bumper.x + movement
        left_limit = WALL_RIGHT_X + WALL_WIDTH_HALF + bumper.lenght_half
        right_limit = WALL_LEFT_X - WALL_WIDTH_HALF - bumper.lenght_half

        # min() and max() are implemented in C, so they are faster than conditions
        # it means: `right_limit < new_x < left_limit`
        bumper.x = max(left_limit, min(right_limit, new_x))

    def _handle_collision(self, collision_info: CollisionInfo, current_time: float):
        """Handle the collision that just occurred."""
        collision_type, data = collision_info

        if collision_type == CollisionType.WALL:
            self._ball.velocity.x *= -1

        elif collision_type == CollisionType.BUMPER:
            bumper = data
            self._last_bumper_collided = bumper
            self._calculate_new_ball_dir(bumper)

        elif collision_type == CollisionType.COIN:
            self._apply_coin_buff(current_time)

        elif collision_type == CollisionType.SCORE:
            bumper_that_scored = data
            if bumper_that_scored == self._bumper_1:
                self._bumper_1.score += 1
                self._reset_ball(-1)
                self._is_someone_scored = True
            elif bumper_that_scored == self._bumper_2:
                self._bumper_2.score += 1
                self._reset_ball(1)
                self._is_someone_scored = True

    def _reset_ball(self, direction: int):
        self._ball.temporal_speed.x, self._ball.temporal_speed.z = TEMPORAL_SPEED_DEFAULT
        self._ball.x, self._ball.z = STARTING_BALL_POS
        self._ball.velocity.x, self._ball.velocity.z = STARTING_BALL_VELOCITY
        self._ball.velocity.z *= direction

    def _calculate_new_ball_dir(self, bumper):
        """
        After the ball hits one of the bumpers, it moves in the other direction, and
        its angle changes based on the point of collision between it and bumper.
        """
        collision_pos_x = bumper.x - self._ball.x
        normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + bumper.lenght_half)
        bounce_angle_radians = math.radians(BOUNCING_ANGLE_DEGREES * normalized_collision_pos_x)
        self._ball.velocity.z = (
            min(BALL_VELOCITY_CAP, abs(self._ball.velocity.z * 1.025 * self._ball.temporal_speed.z)) * bumper.dir_z
        )
        self._ball.velocity.x = self._ball.velocity.z * -math.tan(bounce_angle_radians) * bumper.dir_z
        self._ball.velocity.x = math.copysign(max(abs(self._ball.velocity.x), 0.05), self._ball.velocity.x)

        if (self._ball.z - BALL_RADIUS * self._ball.velocity.z <= bumper.z + bumper.width_half) and (
            self._ball.z + BALL_RADIUS * self._ball.velocity.z >= bumper.z - bumper.width_half
        ):
            self._ball.temporal_speed.x += TEMPORAL_SPEED_INCREASE

    def _apply_coin_buff(self, current_time: float):
        """Applies one of the buffs to the player who scored the coin. Or debuffs their opponent."""
        if not self._coin or not self._last_bumper_collided or not self._is_coin_on_screen():
            return

        # returns 1-5, convert to Buff enum
        buff_id = random.randrange(1, 6)  # noqa: S311
        self._active_buff_or_debuff = Buff(buff_id)  # Convert int to Buff enum
        self._active_buff_or_debuff_start_time = current_time

        match self._active_buff_or_debuff:
            case Buff.CONTROL_REVERSE_ENEMY:
                target_bumper = self._bumper_1 if self._last_bumper_collided == self._bumper_2 else self._bumper_2
                target_bumper.control_reversed = True
                self._active_buff_or_debuff_target = target_bumper
                logger.debug("Debuff target: %s", "bumper_1" if target_bumper == self._bumper_1 else "bumper_2")

            case Buff.SPEED_DECREASE_ENEMY:
                target_bumper = self._bumper_1 if self._last_bumper_collided == self._bumper_2 else self._bumper_2
                target_bumper.speed = BASE_BUMPER_SPEED * 0.1 * self._game_speed
                self._active_buff_or_debuff_target = target_bumper
                logger.debug("Debuff target: %s", "bumper_1" if target_bumper == self._bumper_1 else "bumper_2")

            case Buff.SHORTEN_ENEMY:
                target_bumper = self._bumper_1 if self._last_bumper_collided == self._bumper_2 else self._bumper_2
                target_bumper.lenght_half = 1.25
                self._active_buff_or_debuff_target = target_bumper
                logger.debug("Debuff target: %s", "bumper_1" if target_bumper == self._bumper_1 else "bumper_2")

            case Buff.ELONGATE_PLAYER:
                self._last_bumper_collided.lenght_half = 5
                if (
                    self._last_bumper_collided.x
                    < WALL_RIGHT_X + WALL_WIDTH_HALF + self._last_bumper_collided.lenght_half
                ):
                    self._last_bumper_collided.x = (
                        WALL_RIGHT_X + WALL_WIDTH_HALF + self._last_bumper_collided.lenght_half + 0.1
                    )
                elif (
                    self._last_bumper_collided.x
                    > WALL_LEFT_X - WALL_WIDTH_HALF - self._last_bumper_collided.lenght_half
                ):
                    self._last_bumper_collided.x = (
                        WALL_LEFT_X - WALL_WIDTH_HALF - self._last_bumper_collided.lenght_half - 0.1
                    )
                self._active_buff_or_debuff_target = self._last_bumper_collided
                logger.debug(
                    "Buff target: %s",
                    "bumper_1" if self._last_bumper_collided == self._bumper_1 else "bumper_2",
                )

            case Buff.ENLARGE_PLAYER:
                self._last_bumper_collided.width_half = 1.5
                self._active_buff_or_debuff_target = self._last_bumper_collided
                logger.debug(
                    "Buff target: %s",
                    "bumper_1" if self._last_bumper_collided == self._bumper_1 else "bumper_2",
                )

        logger.info("Buff %s was chosen", Buff(self._active_buff_or_debuff).name)
        # hide the coin
        self._hide_coin()
        self._last_coin_hit_time = current_time

    def _is_coin_on_screen(self):
        """Coin can spawn, move and apply its effects only when it's on the screen."""
        return self._coin.x != HIDDEN_COIN_SPOT

    def _hide_coin(self):
        """Moves the coin off screen."""
        self._coin.x = HIDDEN_COIN_SPOT

    def _update_coin_and_buffs(self, current_time: float):
        """Handles coin spawning and buff expiration."""
        # spawn coin every 30 seconds
        if (
            self._coin
            and current_time - self._last_coin_hit_time >= DEFAULT_COIN_WAIT_TIME
            and not self._is_coin_on_screen()
        ):
            self._coin.x, self._coin.z = STARTING_COIN_POS

        # reset expired buff (only one active at a time)
        if self._active_buff_or_debuff != Buff.NO_BUFF and self._active_buff_or_debuff_target:
            buff_duration = self._active_buff_or_debuff.get_duration_seconds()
            buff_end_time = self._active_buff_or_debuff_start_time + buff_duration

            if current_time >= buff_end_time:
                self._reset_buff_effect()
                self._active_buff_or_debuff = Buff.NO_BUFF
                self._active_buff_or_debuff_start_time = 0.0
                self._active_buff_or_debuff_target = None

    def _reset_buff_effect(self):
        """Reset the effect of the currently active buff when it expires - only affects the targeted bumper."""
        if not self._active_buff_or_debuff_target:
            return

        # Reset all possible buff-affected properties to normal values
        self._active_buff_or_debuff_target.control_reversed = False
        self._active_buff_or_debuff_target.speed = BASE_BUMPER_SPEED * self._game_speed
        self._active_buff_or_debuff_target.lenght_half = BUMPER_LENGTH_HALF
        self._active_buff_or_debuff_target.width_half = BUMPER_WIDTH_HALF

    def as_dict(self) -> SerializedGameState:
        """
        Returns game state as a serializable dictionary.
        Updates the pre-created dictionary to avoid object creation overhead.
        """
        self._serialized_state["bumper_1"]["x"] = self._bumper_1.x
        self._serialized_state["bumper_1"]["z"] = self._bumper_1.z
        self._serialized_state["bumper_1"]["score"] = self._bumper_1.score

        self._serialized_state["bumper_2"]["x"] = self._bumper_2.x
        self._serialized_state["bumper_2"]["z"] = self._bumper_2.z
        self._serialized_state["bumper_2"]["score"] = self._bumper_2.score

        self._serialized_state["ball"]["x"] = self._ball.x
        self._serialized_state["ball"]["z"] = self._ball.z
        self._serialized_state["ball"]["velocity"]["x"] = self._ball.velocity.x
        self._serialized_state["ball"]["velocity"]["z"] = self._ball.velocity.z
        self._serialized_state["ball"]["temporal_speed"]["x"] = self._ball.temporal_speed.x
        self._serialized_state["ball"]["temporal_speed"]["z"] = self._ball.temporal_speed.z

        if self._coin:
            self._serialized_state["coin"]["x"] = self._coin.x
            self._serialized_state["coin"]["z"] = self._coin.z
        else:
            self._serialized_state["coin"] = None

        self._serialized_state["is_someone_scored"] = self._is_someone_scored
        self._serialized_state["last_bumper_collided"] = (
            "_bumper_1" if self._last_bumper_collided == self._bumper_1 else "_bumper_2"
        )
        self._serialized_state["current_buff_or_debuff"] = self._active_buff_or_debuff

        if self._active_buff_or_debuff_target:
            self._serialized_state["current_buff_or_debuff_target"] = (
                "_bumper_1" if self._active_buff_or_debuff_target == self._bumper_1 else "_bumper_2"
            )
        else:
            self._serialized_state["current_buff_or_debuff_target"] = None

        return self._serialized_state


class MultiplayerPongMatch(BasePong):
    """
    Adaptated interface for the pong engine for the purposes of being managed by the GameConsumer in concurrent manner
    for the purposes of being sent to the client via websockets.
    Connects the pong enging to actual players, their inputs and state. Manages players, their connection status,
    as well as the background tasks needed for the proper management of the game loop and connection/reconnection of
    the players.
    """

    id: str
    settings: GameRoomSettings
    tournament_id: None | str
    bracket_id: None | str
    is_in_tournament: bool
    game_loop_task: asyncio.Task | None
    waiting_for_players_timer: asyncio.Task | None
    status: MultiplayerPongMatchStatus = MultiplayerPongMatchStatus.PENDING
    pause_event: asyncio.Event
    time_limit_in_seconds: int
    time_limit_reached: bool
    ranked: bool
    _score_to_win: int
    _player_1: Player
    _player_2: Player

    total_paused_time: float
    pause_start_time: float

    game_speed_dict = {"slow": 0.75, "medium": 1.0, "fast": 1.25}

    def __init__(
        self,
        game_id: str,
        settings: GameRoomSettings,
        is_in_tournament: bool,
        bracket_id: None | str,
        tournament_id: None | str,
    ):
        self.settings = settings
        cool_mode, game_speed, time_limit, ranked, score_to_win = (
            settings["cool_mode"],
            settings["game_speed"],
            settings["time_limit"],
            settings["ranked"],
            settings["score_to_win"],
        )

        super().__init__(cool_mode, self.game_speed_dict[game_speed], asyncio.get_event_loop().time())
        self.id = game_id
        self.is_in_tournament = is_in_tournament
        self.bracket_id = bracket_id
        self.tournament_id = tournament_id
        self.time_limit_in_seconds = time_limit * 60  # in seconds for ease of testing
        self.time_limit_reached = False
        self.ranked = ranked
        self.pause_event = asyncio.Event()
        self.game_loop_task: asyncio.Task | None = None
        self.waiting_for_players_timer = None
        self._score_to_win = score_to_win
        self._player_1 = Player(self._bumper_1)
        self._player_2 = Player(self._bumper_2)

        self.total_paused_time = 0.0
        self.pause_start_time = 0.0

    def __str__(self):
        return self.id

    def __repr__(self):
        return f"{self.status.name.capitalize()} game {self.id}"

    def handle_input(self, action: str, player_id: str, content: int) -> tuple[Player, int] | None: #, timestamp: float
        if player_id == self._player_1.id:
            player = self._player_1
        elif player_id == self._player_2.id:
            player = self._player_2
        else:
            return None
        bumper = player.bumper

        # negative means not pressed, positive means pressed
        is_pressed = content > 0

        match action:
            case "move_left":
                bumper.moves_left = is_pressed
                return player, content #, timestamp
            case "move_right":
                bumper.moves_right = is_pressed
                return player, content #, timestamp

    def add_player(self, player_connected_event: dict) -> Player | None:
        """
        Adds player to the players dict.
        Assigns player to a random bumper.
        Returns Player instance if was successeful, None otherwise.
        """
        player_id = player_connected_event["player_id"]
        available_player_slots = []
        if self._player_1.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._player_1)
        if self._player_2.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._player_2)
        if not available_player_slots:
            return None

        random.shuffle(available_player_slots)
        player = available_player_slots.pop()
        player.id = player_id
        player.set_as_connected(asyncio.get_event_loop().time())
        player.profile_id = int(player_connected_event["profile_id"])
        player.name = player_connected_event["name"]
        player.avatar = player_connected_event["avatar"]
        player.elo = player_connected_event["elo"]
        if player.bumper.dir_z == 1:
            logger.info("[GameWorker]: player {%s} was assigned to player_1", player_id)
        if player.bumper.dir_z == -1:
            logger.info("[GameWorker]: player {%s} was assigned to player_2", player_id)
        return player

    def get_players_based_on_connection(self, connection: PlayerConnectionState) -> list[Player, Player]:
        """Returns a list of players based on their connection state."""
        return [p for p in [self._player_1, self._player_2] if p.connection == connection]

    def get_player_who_connected_earliest(self) -> Player:
        """Returns the player who connected to the game first."""
        if self._player_1.connection_stamp == 0:
            return self._player_2
        if self._player_2.connection_stamp == 0:
            return self._player_1

        if self._player_1.connection_stamp > self._player_2.connection_stamp:
            return self._player_2
        return self._player_1

    def get_player(self, player_id: str) -> Player | None:
        if self._player_1.id == player_id:
            return self._player_1
        if self._player_2.id == player_id:
            return self._player_2
        return None

    def get_other_player(self, player_id: str) -> Player:
        if player_id == self._player_1.id:
            return self._player_2
        return self._player_1

    def stop_waiting_for_players_timer(self) -> None:
        timer = self.waiting_for_players_timer
        if timer and not timer.cancelled():
            timer.cancel()
        self.waiting_for_players_timer = None

    def get_result(self) -> tuple[Player, Player] | None:
        """
        Returns winner and loser or None, if the game is not decided yet.
        If time limit has been reached, the player who has bigger score is considered to be a winner.
        """
        if self.time_limit_reached:
            if self._player_1.bumper.score > self._player_2.bumper.score:
                return self._player_1, self._player_2
            if self._player_2.bumper.score > self._player_1.bumper.score:
                return self._player_2, self._player_1
            return None

        if self._player_1.bumper.score >= self._score_to_win:
            return self._player_1, self._player_2
        if self._player_2.bumper.score >= self._score_to_win:
            return self._player_2, self._player_1
        return None

    def as_dict_with_timing(self, current_time) -> SerializedGameState:
        """
        Updates parent pong state dict with timing information, since `BasePong` doesn't have an access to
        async functions.
        Note: The state is never sent to the client when the game is paused.
        """
        pong_state = super().as_dict()
        pong_state["elapsed_seconds"] = int(current_time - self.start_time - self.total_paused_time)
        pong_state["time_limit_reached"] = self.time_limit_reached

        if self._active_buff_or_debuff != Buff.NO_BUFF and self._active_buff_or_debuff_target:
            buff_duration = self._active_buff_or_debuff.get_duration_seconds()  # In seconds
            buff_end_time = self._active_buff_or_debuff_start_time + buff_duration
            remaining_time_seconds = max(0.0, buff_end_time - current_time)

            pong_state["current_buff_or_debuff_remaining_time"] = remaining_time_seconds * 1000.0

        return pong_state


class GameWorkerConsumer(AsyncConsumer):
    """
    Manages multiple concurrent pong matches. Receives inputs from `GameRoomConsumer` and sends back different events
    based on what happened in the match.
    """

    def __init__(self):
        super().__init__()
        self.matches: dict[str, MultiplayerPongMatch] = {}
        self.channel_layer = get_channel_layer()

    ##### EVENT HANDLERS AND CHANNEL METHODS #####
    async def player_connected(self, event: GameServerToGameWorker.PlayerConnected):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]

        ### CONNECTION OF THE FIRST PLAYER TO NOT YET CREATED MATCH ###
        if game_room_id not in self.matches:
            await self._add_player_and_create_pending_match(event)
            return

        match = self.matches[game_room_id]

        ### CONNECTION OF THE SECOND PLAYER TO THE PENDING MATCH ###
        if (
            match.status == MultiplayerPongMatchStatus.PENDING
            and len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) == PLAYERS_REQUIRED - 1
        ):
            await self._add_player_and_start_match(match, event)
        ### RECONNECTION OF ONE OF THE PLAYERS TO THE MATCH ###
        elif match.status in {MultiplayerPongMatchStatus.PENDING, MultiplayerPongMatchStatus.PAUSED}:
            await self._reconnect_player(player_id, match)

    async def player_disconnected(self, event: GameServerToGameWorker.PlayerDisconnected):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]

        match = self.matches.get(game_room_id)
        if match is None or match.status == MultiplayerPongMatchStatus.FINISHED:
            logger.info(
                "[GameWorker]: player {%s} disconnected from a finished game {%s}",
                player_id,
                game_room_id,
            )
            return

        player = match.get_player(player_id)
        if player is None:
            logger.warning(
                "[GameWorker]: disconnected player {%s} not found in the game {%s}",
                player_id,
                game_room_id,
            )
            return

        player.connection = PlayerConnectionState.DISCONNECTED
        if match.status == MultiplayerPongMatchStatus.PENDING:
            logger.info(
                "[GameWorker]: player {%s} has been disconnected from the pending game {%s}",
                player_id,
                game_room_id,
            )
            return

        await self._pause(match, player)
        player.reconnection_timer = asyncio.create_task(self._wait_for_reconnection_task(match, player))
        logger.info(
            "[GameWorker]: player {%s} has been disconnected from the ongoing game {%s}",
            player_id,
            game_room_id,
        )

    async def player_inputed(self, event: GameServerToGameWorker.PlayerInputed):
        """
        Handles player input. There is no validation of the input, because it is a worker,
        and event source is the server, which we can trust.
        """
        game_room_id = event["game_room_id"]
        match = self.matches.get(game_room_id)
        if match is None or match.status != MultiplayerPongMatchStatus.ONGOING:
            logger.warning("[GameWorker]: input was sent for not running game {%s}", game_room_id)
            return

        player_id = event["player_id"]
        action = event["action"]
        content = event["content"]
        """timestamp = event["timestamp"]"""

        match action:
            case "move_left" | "move_right":
                result = match.handle_input(action, player_id, content)  #, timestamp
                if not result:
                    return
                player, content = result #, timestamp

                await self.channel_layer.group_send(
                    self._to_game_room_group_name(match),
                    GameServerToClient.InputConfirmed(
                        type="worker_to_client_open",
                        action=action,
                        player_number=1 if player.bumper.dir_z == 1 else 2,
                        content=content,
                        position_x=player.bumper.x,
                        #timestamp=timestamp,
                    ),
                )

    ##### BACKGROUND TASKS #####
    async def _match_game_loop_task(self, match: MultiplayerPongMatch):
        """Asynchrounous loop that runs one specific match."""
        logger.info("[GameWorker]: match {%s} has been started", match)
        try:
            while match.status != MultiplayerPongMatchStatus.FINISHED:
                if match.status == MultiplayerPongMatchStatus.PAUSED:
                    await match.pause_event.wait()
                tick_start_time = asyncio.get_event_loop().time()

                elapsed_seconds = tick_start_time - match.start_time - match.total_paused_time
                if not match.time_limit_reached and elapsed_seconds >= match.time_limit_in_seconds:
                    logger.info("[GameWorker]: match {%s} reached time limit", match.id)
                    match.time_limit_reached = True

                    result = match.get_result()
                    # someone scored more than the other
                    if result:
                        winner, loser = result

                        match_db = await self._write_result_to_db(winner, loser, match, "finished")
                        await self._send_player_won_event(
                            match,
                            "player_won",
                            winner,
                            loser,
                            match_db.elo_change if not match.is_in_tournament else 0,
                        )
                        await self._do_after_match_cleanup(match, False)
                        logger.info("[GameWorker]: player {%s} won due to time limit in game {%s}", winner.id, match)
                        break

                    # equal score: set the ball speed to the max!!
                    match.set_ball_to_max_speed()
                    logger.info("[GameWorker]: equal scores at time limit - activating sudden death mode")

                match.resolve_next_tick(GAME_TICK_INTERVAL, tick_start_time)
                if result := match.get_result():
                    winner, loser = result
                    match_db = await self._write_result_to_db(winner, loser, match, Bracket.FINISHED)
                    await self._send_player_won_event(
                        match,
                        "player_won",
                        winner,
                        loser,
                        match_db.elo_change if not match.is_in_tournament else 0,
                    )
                    await self._do_after_match_cleanup(match, False)
                    logger.info("[GameWorker]: player {%s} has won the game {%s}", winner.id, match)
                    break
                await self.channel_layer.group_send(
                    self._to_game_room_group_name(match.id),
                    GameServerToClient.StateUpdated(
                        type="worker_to_client_open",
                        action="state_updated",
                        state=match.as_dict_with_timing(tick_start_time),
                    ),
                )
                tick_end_time = asyncio.get_event_loop().time()
                time_taken_for_current_tick = tick_end_time - tick_start_time
                # tick the game for this match 30 times a second
                await asyncio.sleep(max(GAME_TICK_INTERVAL - time_taken_for_current_tick, 0))
            logger.info("[GameWorker]: task for game {%s} has been done", match)
        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for game {%s} has been cancelled", match)
        except Exception:  # noqa: BLE001
            logger.critical(traceback.format_exc())

    async def _wait_for_both_player_task(self, match: MultiplayerPongMatch):
        """
        Called with `asyncio.create_task`. Waits for both players to be connected to the game.
        Cancels the game if the players do not manage to connect in time.
        """
        try:
            logger.info("[GameWorker]: waiting for players to connect to the game {%s}", match)
            await asyncio.sleep(5)

            # if we are here, players didn't connect
            if len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) < PLAYERS_REQUIRED:
                if not match.is_in_tournament:
                    await self.channel_layer.group_send(
                        self._to_game_room_group_name(match),
                        GameServerToClient.GameCancelled(
                            type="worker_to_client_close",
                            action="game_cancelled",
                            tournament_id=match.tournament_id,
                            close_code=CloseCodes.CANCELLED,
                        ),
                    )
                elif match.is_in_tournament:
                    winner = match.get_player_who_connected_earliest()
                    loser = match.get_other_player(winner.id)
                    await self.channel_layer.group_send(
                        self._to_game_room_group_name(match),
                        GameServerToClient.PlayerWon(
                            type="worker_to_client_close",
                            action="player_resigned",
                            winner=winner.as_dict(),
                            loser=loser.as_dict(),
                            elo_change=0,
                            tournament_id=match.tournament_id,
                            close_code=CloseCodes.CANCELLED,
                        ),
                    )
                    # If the tournament game is cancelled, there is a winner: player who connected first
                    await Bracket.objects.async_update_finished_bracket(
                        match.bracket_id,
                        winner.profile_id,
                        0,
                        0,
                        Bracket.FINISHED,
                    )
                    await self.channel_layer.send(
                        "tournament",
                        {
                            "type": "tournament_game_finished",
                            "tournament_id": str(match.tournament_id),
                            "bracket_id": match.bracket_id,
                        },
                    )
                await self._do_after_match_cleanup(match, True)
                logger.info("[GameWorker]: players didn't connect to the game {%s}. Closing", match)

        except asyncio.CancelledError:
            logger.info("[GameWorker]: both players reconnected\nwaiting for both timer {%s} has been cancelled", match)
        except Exception:  # noqa: BLE001
            logger.critical(traceback.format_exc())

    async def _wait_for_reconnection_task(self, match: MultiplayerPongMatch, player: Player):
        start_time = asyncio.get_event_loop().time()
        initial_time = player.reconnection_time

        try:
            logger.info(
                "[GameWorker]: waiting for player {%s} to reconnect to game {%s} ({%.1f}s remaining)",
                player.id,
                match.id,
                player.reconnection_time,
            )
            await asyncio.sleep(player.reconnection_time)

            # if we reach here,  player didn't reconnect
            player.reconnection_time = 0.0

            if match.status == MultiplayerPongMatchStatus.FINISHED:
                logger.info(
                    "[GameWorker]: reconnection timeout for finished game {%s}",
                    match.id,
                )
                return

            match.status = MultiplayerPongMatchStatus.FINISHED
            winner = match.get_other_player(player.id)
            match_db = await self._write_result_to_db(winner, player, match, "finished")
            await self._send_player_won_event(
                match,
                "player_resigned",
                winner,
                player,
                match_db.elo_change if not match.is_in_tournament else 0,
            )
            await self._do_after_match_cleanup(match, True)
            logger.info(
                "[GameWorker]: player {%s} resigned by timeout in game {%s}. Winner is {%s}",
                player.id,
                match.id,
                winner.id,
            )

        except asyncio.CancelledError:
            # player reconnected
            elapsed = asyncio.get_event_loop().time() - start_time
            player.reconnection_time = max(0.0, initial_time - elapsed)
            logger.info(
                "[GameWorker]: reconnection timer cancelled for player {%s} with {%.1f}s remaining",
                player.id,
                player.reconnection_time,
            )
            raise
        except Exception:  # noqa: BLE001
            logger.critical(traceback.format_exc())

    ##### PLAYER MANAGEMENT METHODS #####
    async def _add_player_and_create_pending_match(self, event: GameServerToGameWorker.PlayerConnected):
        player_id = event["player_id"]
        game_room_id = event["game_room_id"]
        settings = event["settings"]
        is_in_tournament = event["is_in_tournament"]
        bracket_id = event["bracket_id"]
        tournament_id = event["tournament_id"]

        match = self.matches[game_room_id] = MultiplayerPongMatch(
            game_room_id,
            settings,
            is_in_tournament,
            bracket_id,
            tournament_id,
        )
        match.waiting_for_players_timer = asyncio.create_task(self._wait_for_both_player_task(match))
        player = match.add_player(event)
        await self._send_player_id_and_number_to_player(player, match)
        logger.info(
            "[GameWorker]: player {%s} was added to newly created game {%s}",
            player_id,
            game_room_id,
        )

    async def _add_player_and_start_match(
        self,
        match: MultiplayerPongMatch,
        event: GameServerToGameWorker.PlayerConnected,
    ):
        """Cancels waiting for players timer, and starts the game loop for this match."""
        player_id = event["player_id"]
        match.stop_waiting_for_players_timer()
        player = match.add_player(event)
        await self._send_player_id_and_number_to_player(player, match)
        match.status = MultiplayerPongMatchStatus.ONGOING
        match.game_loop_task = asyncio.create_task(self._match_game_loop_task(match))
        await self.channel_layer.group_send(
            self._to_game_room_group_name(match),
            GameServerToClient.GameStarted(type="worker_to_client_open", action="game_started"),
        )
        logger.info("[GameWorker]: player {%s} has been added to existing game {%s}", player_id, match.id)

    async def _reconnect_player(self, player_id: str, match: MultiplayerPongMatch):
        """
        Sets the player as reconnected.
        Stops the reconnection timer and unpauses the game.
        """
        player = match.get_player(player_id)
        if not player:
            logger.warning(
                "[GameWorker]: illegal player {%s} tried to connect to the ongoing game {%s}",
                player_id,
                match,
            )
            return
        player.set_as_connected(asyncio.get_event_loop().time())
        player.stop_waiting_for_reconnection_timer()
        await self._send_player_id_and_number_to_player(player, match)
        if not len(match.get_players_based_on_connection(PlayerConnectionState.DISCONNECTED)):
            await self._unpause(match)
        logger.info("[GameWorker]: player {%s} has been reconnected to the game {%s}", player_id, match.id)

    async def _send_player_id_and_number_to_player(self, player: Player, match: MultiplayerPongMatch):
        player_id = player.id
        await self.channel_layer.group_send(
            self._to_player_group_name(player_id),
            GameServerToClient.PlayerJoined(
                type="worker_to_client_open",
                action="player_joined",
                player_id=player_id,
                player_number=1 if player.bumper.dir_z == 1 else 2,
                is_paused=match.status == MultiplayerPongMatchStatus.PAUSED,
                settings=match.settings,
            ),
        )

    ##### MATCH MANAGEMENT METHODS #####
    async def _do_after_match_cleanup(self, match: MultiplayerPongMatch, should_cancel: bool):
        """
        Cleans the match from the memory of the worker. Marks GameRoom in the database as closed.
        `should_cancel` indicates if the match task should be cancelled. Should not be True when the match
        can be allowed to end naturally, for example, if a player can win.
        """
        self.matches.pop(str(match), None)
        if match.game_loop_task and not match.game_loop_task.cancelled() and should_cancel:
            match.game_loop_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await match.game_loop_task
        game_room_db: GameRoom = await database_sync_to_async(GameRoom.objects.get)(id=match.id)
        game_room_db.status = GameRoom.CLOSED
        await database_sync_to_async(game_room_db.save)()

    async def _pause(
        self,
        match: MultiplayerPongMatch,
        disconnected_player: Player,
    ):
        match.pause_start_time = asyncio.get_event_loop().time()

        await self.channel_layer.group_send(
            self._to_game_room_group_name(match),
            GameServerToClient.GamePaused(
                type="worker_to_client_open",
                action="game_paused",
                remaining_time=int(disconnected_player.reconnection_time),
                name=disconnected_player.name,
            ),
        )
        match.status = MultiplayerPongMatchStatus.PAUSED
        match.pause_event.clear()
        logger.info("[GameWorker]: game {%s} has been paused", match.id)

    async def _unpause(self, match: MultiplayerPongMatch):
        if match.status != MultiplayerPongMatchStatus.PAUSED:
            logger.warning("[GameWorker]: game {%s} can't be unpaused, as it was not paused")
            return

        pause_duration = asyncio.get_event_loop().time() - match.pause_start_time
        match.total_paused_time += pause_duration
        match.pause_start_time = 0.0

        await self.channel_layer.group_send(
            self._to_game_room_group_name(match),
            GameServerToClient.GameUnpaused(type="worker_to_client_open", action="game_unpaused"),
        )
        match.status = MultiplayerPongMatchStatus.ONGOING
        if not match.pause_event.is_set():
            match.pause_event.set()
        logger.info("[GameWorker]: game {%s} has been unpaused", match.id)

    async def _write_result_to_db(
        self,
        winner: Player,
        loser: Player,
        match: MultiplayerPongMatch,
        status: Literal["finished", "cancelled"],
    ) -> Match | Bracket:
        if not match.is_in_tournament:
            match_db, winner_db, loser_db = await Match.objects.async_resolve(
                winner.profile_id,
                loser.profile_id,
                winner.bumper.score,
                loser.bumper.score,
                match.ranked,
            )
            winner.elo = winner_db.elo
            loser.elo = loser_db.elo
            return match_db

        return await Bracket.objects.async_update_finished_bracket(
            match.bracket_id,
            winner.profile_id,
            winner.bumper.score,
            loser.bumper.score,
            status,
        )

    async def _send_player_won_event(
        self,
        match: MultiplayerPongMatch,
        action: Literal["player_won", "player_resigned"],
        winner: Player,
        loser: Player,
        elo_change: int,
    ):
        await self.channel_layer.group_send(
            self._to_game_room_group_name(match),
            GameServerToClient.PlayerWon(
                type="worker_to_client_close",
                action=action,
                winner=winner.as_dict(),
                loser=loser.as_dict(),
                elo_change=elo_change if match.ranked else 0,
                close_code=CloseCodes.NORMAL_CLOSURE,
                tournament_id=match.tournament_id,
            ),
        )

        # Special case: notification for the tournament consumer.
        if match.is_in_tournament:
            await self.channel_layer.send(
                "tournament",
                {
                    "type": "tournament_game_finished",
                    "tournament_id": str(match.tournament_id),
                    "bracket_id": match.bracket_id,
                },
            )

    # To avoid typing errors.
    def _to_game_room_group_name(self, match: MultiplayerPongMatch):
        return f"game_room_{match}"

    def _to_player_group_name(self, player_id: str):
        return f"player_{player_id}"
