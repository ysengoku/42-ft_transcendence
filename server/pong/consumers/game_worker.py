import asyncio
import logging
import math
import random
from dataclasses import dataclass, field
from enum import Enum, auto

from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

logger = logging.getLogger("server")
logging.getLogger("asyncio").setLevel(logging.WARNING)
#### CONSTANTS ####
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
GAME_TICK_INTERVAL = 1.0 / 60
PLAYERS_REQUIRED = 2
###################


class PongMatchState(Enum):
    PENDING = auto()
    ONGOING = auto()
    PAUSED = auto()
    ENDED = auto()


class PlayerConnectionState(Enum):
    NOT_CONNECTED = auto()
    CONNECTED = auto()
    DISCONNECTED = auto()


@dataclass
class Player:
    id: str = ""
    connection: PlayerConnectionState = PlayerConnectionState.NOT_CONNECTED
    # TODO: move time to constants
    reconnection_time = 10


@dataclass(slots=True)
class Vector2:
    x: float
    z: float


@dataclass(slots=True)
class Bumper(Vector2):
    dir_z: int
    score: int = 0
    moves_left: bool = False
    moves_right: bool = False
    player: Player = field(default_factory=Player)


@dataclass(slots=True)
class Ball(Vector2):
    velocity: Vector2
    temporal_speed: Vector2


class PongMatch:
    """
    Pong engine. Stores, advances and modifies the state of the game.
    It's the base class designed to be pure and not coupled with the code related Django channels.
    """

    id: str = "No id"
    state: PongMatchState
    pause_event = asyncio.Event
    _bumper_1: Bumper
    _bumper_2: Bumper
    _ball: Ball
    _scored_last: Bumper | None = None
    _someone_scored: bool

    def __init__(self, game_id: str):
        self.id = game_id
        self.state = PongMatchState.PENDING
        self.pause_event = asyncio.Event()
        self._bumper_1 = Bumper(
            *STARTING_BUMPER_1_POS,
            dir_z=1,
        )
        self._bumper_2 = Bumper(
            *STARTING_BUMPER_2_POS,
            dir_z=-1,
        )
        self._ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))
        self._is_someone_scored = False

    def __str__(self):
        return self.id

    def __repr__(self):
        return f"{self.state.name.capitalize()} game {self.id}"

    def resolve_next_tick(self):
        """
        The most important method of the engine. Advances the game by one tick.
        Moves the objects in the game by one subtick at a time.
        This approach is called Conservative Advancement.
        """
        self._someone_scored = False
        total_distance_x = abs((self._ball.temporal_speed.x) * self._ball.velocity.x)
        total_distance_z = abs((self._ball.temporal_speed.z) * self._ball.velocity.z)
        self._ball.temporal_speed.x = max(TEMPORAL_SPEED_DEFAULT[0], self._ball.temporal_speed.x - TEMPORAL_SPEED_DECAY)
        self._ball.temporal_speed.z = max(TEMPORAL_SPEED_DEFAULT[1], self._ball.temporal_speed.z - TEMPORAL_SPEED_DECAY)
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
        Adds player to the players dict.
        Assigns player to a random bumper.
        """
        available_player_slots = []
        if self._bumper_1.player.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._bumper_1)
        if self._bumper_2.player.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._bumper_2)
        if not available_player_slots:
            return

        random.shuffle(available_player_slots)
        bumper = available_player_slots.pop()
        bumper.player.id = player_id
        bumper.player.connection = PlayerConnectionState.CONNECTED
        if bumper.dir_z == 1:
            logger.info("[GameWorker]: player {%s} was assigned to bumper_1", player_id)
        if bumper.dir_z == -1:
            logger.info("[GameWorker]: player {%s} was assigned to bumper_2", player_id)

    def get_players_based_on_connection(self, connection: PlayerConnectionState) -> list[Player, Player]:
        """Returns a list of players based on their connection state."""
        return [p for p in [self._bumper_1.player, self._bumper_2.player] if p.connection == connection]

    def get_player(self, player_id: str) -> Player | None:
        if self._bumper_1.player.id == player_id:
            return self._bumper_1.player
        if self._bumper_2.player.id == player_id:
            return self._bumper_2.player
        return None

    def get_other_player(self, player_id: str) -> Player:
        if player_id == self._bumper_1.player.id:
            return self._bumper_1.player
        return self._bumper_2.player

    def as_dict(self):
        """Converts current state of the pong to the dict for purposes like sending over websocket connection."""
        return {
            "bumper_1": {"x": self._bumper_1.x, "z": self._bumper_1.z},
            "bumper_2": {"x": self._bumper_2.x, "z": self._bumper_2.z},
            "ball": {
                "x": self._ball.x,
                "z": self._ball.z,
                "velocity": {"x": self._ball.velocity.x, "z": self._ball.velocity.z},
            },
            "scored_last": self._scored_last.id if self._scored_last else None,
            "is_someone_scored": self._is_someone_scored,
        }

    def handle_input(self, player_id: str, action: str, content: bool):
        if player_id == self._bumper_1.player.id:
            bumper = self._bumper_1
        elif player_id == self._bumper_2.player.id:
            bumper = self._bumper_2
        else:
            return

        match action:
            case "move_left":
                bumper.moves_left = content
            case "move_right":
                bumper.moves_right = content

    def _reset_ball(self, direction: int):
        self._ball.temporal_speed.x, self._ball.temporal_speed.z = TEMPORAL_SPEED_DEFAULT
        self._ball.x, self._ball.z = STARTING_BALL_POS
        self._ball.velocity.x, self._ball.velocity.z = STARTING_BALL_VELOCITY
        self._ball.velocity.z *= direction

    def _is_collided_with_ball(self, bumper, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the bumper which is given as a
        parameter to this function.
        """
        return (
            (self._ball.x - BALL_RADIUS + ball_subtick_x * self._ball.velocity.x <= bumper.x + BUMPER_LENGTH_HALF)
            and (self._ball.x + BALL_RADIUS + ball_subtick_x * self._ball.velocity.x >= bumper.x - BUMPER_LENGTH_HALF)
            and (self._ball.z - BALL_RADIUS + ball_subtick_z * self._ball.velocity.z <= bumper.z + BUMPER_WIDTH_HALF)
            and (self._ball.z + BALL_RADIUS + ball_subtick_z * self._ball.velocity.z >= bumper.z - BUMPER_WIDTH_HALF)
        )

    def _calculate_new_dir(self, bumper):
        collision_pos_x = bumper.x - self._ball.x
        normalized_collision_pos_x = collision_pos_x / (BALL_RADIUS + BUMPER_LENGTH_HALF)
        bounce_angle_radians = math.radians(BOUNCING_ANGLE_DEGREES * normalized_collision_pos_x)
        self._ball.velocity.z = (
            min(BALL_VELOCITY_CAP, abs(self._ball.velocity.z * 1.025 * self._ball.temporal_speed.z)) * bumper.dir_z
        )
        self._ball.velocity.x = self._ball.velocity.z * -math.tan(bounce_angle_radians) * bumper.dir_z
        self._ball.velocity.x = math.copysign(max(abs(self._ball.velocity.x), 0.05), self._ball.velocity.x)

        collision_pos_z = bumper.z - self._ball.z
        normalized_collision_pos_z = collision_pos_z / (BALL_RADIUS + BUMPER_WIDTH_HALF)
        normalized_collision_pos_z
        if (self._ball.z - BALL_RADIUS * self._ball.velocity.z <= bumper.z + BUMPER_WIDTH_HALF) and (
            self._ball.z + BALL_RADIUS * self._ball.velocity.z >= bumper.z - BUMPER_WIDTH_HALF
        ):
            self._ball.temporal_speed.x += TEMPORAL_SPEED_INCREASE

    def _check_ball_scored(self):
        if self._ball.z >= BUMPER_2_BORDER:
            self._bumper_1.score += 1
            self._reset_ball(-1)
            self._is_someone_scored = True
        elif self._ball.z <= BUMPER_1_BORDER:
            self._bumper_2.score += 1
            self._reset_ball(1)
            self._is_someone_scored = True

    def _check_ball_wall_collision(self):
        if self._ball.x <= WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF:
            self._ball.x = WALL_RIGHT_X + BALL_RADIUS + WALL_WIDTH_HALF
            self._ball.velocity.x *= -1
        if self._ball.x >= WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF:
            self._ball.x = WALL_LEFT_X - BALL_RADIUS - WALL_WIDTH_HALF
            self._ball.velocity.x *= -1

    def _check_ball_bumper_collision(self, ball_subtick_z, ball_subtick_x):
        if self._ball.velocity.z <= 0 and self._is_collided_with_ball(self._bumper_1, ball_subtick_z, ball_subtick_x):
            self._calculate_new_dir(self._bumper_1)
        elif self._ball.velocity.z > 0 and self._is_collided_with_ball(self._bumper_2, ball_subtick_z, ball_subtick_x):
            self._calculate_new_dir(self._bumper_2)

    def _move_bumpers(self, bumper_subtick):
        if self._bumper_1.moves_left and not self._bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
            self._bumper_1.x += bumper_subtick
        if self._bumper_1.moves_right and not self._bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
            self._bumper_1.x -= bumper_subtick

        if self._bumper_2.moves_left and not self._bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - BUMPER_LENGTH_HALF:
            self._bumper_2.x += bumper_subtick
        if self._bumper_2.moves_right and not self._bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + BUMPER_LENGTH_HALF:
            self._bumper_2.x -= bumper_subtick

    def _move_ball(self, ball_subtick_z, ball_subtick_x):
        self._ball.z += ball_subtick_z * self._ball.velocity.z
        self._ball.x += ball_subtick_x * self._ball.velocity.x


class GameConsumer(AsyncConsumer):
    def __init__(self):
        super().__init__()
        self.matches: dict[str, PongMatch] = {}
        self.matches_tasks: dict[str, asyncio.Task] = {}
        self.timer_tasks: dict[str, asyncio.Task] = {}
        self.channel_layer = get_channel_layer()

    async def player_connected(self, event: dict):
        match_id = event["game_room_id"]  # reuse id of the game room as an id for the match
        player_id = event["player_id"]

        ### CONNECTION OF THE FIRST PLAYER TO NOT YET CREATED MATCH ###
        if match_id not in self.matches:
            self._add_player_and_create_pending_match(player_id, match_id)
            return

        match = self.matches[match_id]

        ### CONNECTION OF THE SECOND PLAYER TO THE PENDING MATCH ###
        if (
            match.state == PongMatchState.PENDING
            and len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) == PLAYERS_REQUIRED - 1
        ):
            self._add_player_and_start_match(player_id, match)

        ### RECONNECTION OF ONE OF THE PLAYERS TO THE MATCH ###
        elif match.state in {PongMatchState.PENDING, PongMatchState.ONGOING, PongMatchState.PAUSED}:
            self._reconnect_player(player_id, match)

    async def player_disconnected(self, event: dict):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]

        match = self.matches.get(game_room_id)
        if match is None or match.state == PongMatchState.ENDED:
            logger.warning(
                "[GameWorker]: player {%s} disconnected from the non-existent or ended game {%s}",
                player_id,
                game_room_id,
            )
            return

        disconnected_player = match.get_player(player_id)
        if disconnected_player is None:
            logger.warning(
                "[GameWorker]: disconnected player {%s} not found in the game {%s}",
                player_id,
                game_room_id,
            )
            return

        disconnected_player.connection = PlayerConnectionState.DISCONNECTED
        if match.state == PongMatchState.PENDING:
            logger.info(
                "[GameWorker]: player {%s} has been disconnected from the pending game {%s}",
                player_id,
                game_room_id,
            )
            return

        logger.info(
            "[GameWorker]: player {%s} has been disconnected from the ongoing game {%s}",
            player_id,
            game_room_id,
        )
        self._pause(match)
        self._start_waiting_for_reconnection_timer(match, disconnected_player)

        # TODO: handle the case where both players disconnect
        if not match.get_players_based_on_connection(PlayerConnectionState.CONNECTED):
            self._cleanup_match(game_room_id)
            # TODO: add the match result to the db
            logger.info("[GameWorker]: no players are left in the game {%s}. Closing", game_room_id)

    async def _start_match_game_loop(self, game_room_id: str):
        """Asynchrounous loop that runs one specific match."""
        match = self.matches[game_room_id]
        logger.info("[GameWorker]: match {%s} has been started", game_room_id)
        try:
            # TODO: tweak the condition for the running of the game loop
            while match.state != PongMatchState.ENDED:
                if match.state == PongMatchState.PAUSED:
                    await match.pause_event.wait()
                tick_start_time = asyncio.get_event_loop().time()
                match.resolve_next_tick()
                await self.send_state_to_players(game_room_id, match.as_dict())
                tick_end_time = asyncio.get_event_loop().time()
                time_taken_for_current_tick = tick_end_time - tick_start_time
                # tick the game for this match 30 times a second
                await asyncio.sleep(max(GAME_TICK_INTERVAL - time_taken_for_current_tick, 0))
            logger.info("[GameWorker]: task for game {%s} has been done", game_room_id)
        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for game {%s} has been cancelled", game_room_id)

    async def player_inputed(self, event: dict):
        """
        Handles player input. There is no validation of the input, because it is a worker,
        and event source is the server, which we can trust.
        """
        game_room_id = event["game_room_id"]
        match = self.matches.get(game_room_id)
        if match is None or match.state != PongMatchState.ONGOING:
            logger.warning("[GameWorker]: input was sent for not running game {%s}", game_room_id)

        player_id = event["player_id"]
        action = event["action"]
        content = event["content"]

        match action:
            case "move_left" | "move_right":
                match.handle_input(player_id, action, content)

    async def send_state_to_players(self, game_room_id: str, state: dict):
        group_name = self._to_group_name(game_room_id)
        await self.channel_layer.group_send(group_name, {"type": "state_updated", "state": state})

    async def _wait_for_both_player(self, game_room_id: str):
        """
        Called with `asyncio.create_task`. Waits for both players to be connected to the game.
        Cancels the game if the players do not manage to connect in time.
        """
        try:
            logger.info("[GameWorker]: waiting for players to connect to the game {%s}", game_room_id)
            await asyncio.sleep(5)
            match = self.matches[game_room_id]
            if len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) < PLAYERS_REQUIRED:
                self._cleanup_match(game_room_id)
                await self.channel_layer.group_send(self._to_group_name(game_room_id), {"type": "game_cancelled"})
                logger.info("[GameWorker]: players didn't connect to the game {%s}. Closing", game_room_id)

        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for timer {%s} has been cancelled", game_room_id)

    async def _wait_for_reconnection(self, match: PongMatch, player: Player):
        try:
            logger.info(
                "[GameWorker]: waiting for the player {%s} to connect to the game {%s}",
                match,
                player.id,
            )
            while player.reconnection_time > 0:
                await asyncio.sleep(0.2)
                player.reconnection_time -= 0.2
                logger.info(
                    "[GameWorker]: {%.1f} seconds left for player {%s}",
                    player.reconnection_time,
                    player.id,
                )

            if match.state == PongMatchState.ENDED:
                return logger.warning(
                    "[GameWorker]: players didn't reconnect to non-existent or ended game {%s}. Closing", match,
                )

            self._cleanup_match(match)

            # TODO: move this line to ._end_match(), refactor it to accept match directly
            match.state = PongMatchState.ENDED
            winner = match.get_other_player(player.id)
            await self.channel_layer.group_send(
                self._to_group_name(match),
                {
                    "type": "resignation",
                    "winner": winner.id,
                },
            )
            logger.info(
                "[GameWorker]: player {%s} resigned by disconnecting in the game {%s}. Winner is {%s}",
                player.id,
                match,
                winner.id,
            )

        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for timer {%s} has been cancelled", match)

    def _add_player_and_create_pending_match(self, player_id: str, match_id: str):
        self.matches[match_id] = PongMatch(match_id)
        self.matches[match_id].add_player(player_id)
        self._start_waiting_for_players_timer(match_id)
        logger.info("[GameWorker]: player {%s} was added to newly created game {%s}", player_id, match_id)

    def _add_player_and_start_match(self, player_id: str, match: PongMatch):
        """Cancels waiting for players timer, and starts the game loop for this match."""
        match.add_player(player_id)
        self._stop_waiting_for_players_timer(match.id)
        match.state = PongMatchState.ONGOING
        self.matches_tasks[match.id] = asyncio.create_task(self._start_match_game_loop(match.id))
        logger.info("[GameWorker]: player {%s} has been added to existing game {%s}", player_id, match.id)

    def _reconnect_player(self, player_id: str, match: PongMatch):
        """
        Sets the player as reconnected.
        Stops the reconnection timer and unpauses the game.
        """
        player = match.get_player(player_id)
        if not player:
            logger.warning(
                "[GameWorker]: illegal player {%s} tried to connect to the ongoing game {%s}",
                player_id,
                match.id,
            )
            return
        player.connection = PlayerConnectionState.CONNECTED
        self._stop_waiting_for_reconnection_timer(match, player)
        self._unpause(match)
        logger.info("[GameWorker]: player {%s} has been reconnected to the game {%s}", player_id, match.id)

    def _cleanup_match(self, match_id: str):
        """Cleans up after the match. Stops its game loop, removes from `matches` and `tasks` dicts."""
        match_task = self.matches_tasks.pop(match_id, None)
        if match_task and not match_task.cancelled():
            match_task.cancel()
        self.matches.pop(match_id, None)

    def _start_waiting_for_players_timer(self, match_id: str):
        self.timer_tasks[self._to_waiting_for_players_timer_name(match_id)] = asyncio.create_task(
            self._wait_for_both_player(match_id),
        )

    def _stop_waiting_for_players_timer(self, match_id: str):
        task = self.timer_tasks.pop(self._to_waiting_for_players_timer_name(match_id), None)
        if task and not task.cancelled():
            task.cancel()

    def _start_waiting_for_reconnection_timer(self, match: PongMatch, disconnected_player: Player):
        self.timer_tasks[self._to_reconnection_timer_name(match.id, disconnected_player.id)] = asyncio.create_task(
            self._wait_for_reconnection(match, disconnected_player),
        )

    def _stop_waiting_for_reconnection_timer(self, match: PongMatch, reconnected_player: Player):
        task = self.timer_tasks.pop(self._to_reconnection_timer_name(match.id, reconnected_player.id), None)
        if task and not task.cancelled():
            task.cancel()

    def _pause(self, match: PongMatch):
        match.state = PongMatchState.PAUSED
        match.pause_event.clear()
        logger.info("[GameWorker]: game {%s} has been paused", match.id)

    def _unpause(self, match: PongMatch):
        match.state = PongMatchState.ONGOING
        if not match.pause_event.is_set():
            match.pause_event.set()
        logger.info("[GameWorker]: game {%s} has been unpaused", match.id)

    ### Functions for avoiding typing errors, for objects that need specific strings to be used. ###
    def _to_group_name(self, match_id: str):
        return f"game_room_{match_id}"

    def _to_reconnection_timer_name(self, match_id: str, player_id: str):
        return f"reconnection_timer_{match_id}_{player_id}"

    def _to_waiting_for_players_timer_name(self, match_id: str):
        return "waiting_for_players_timer_" + match_id
