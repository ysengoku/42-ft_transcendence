import asyncio
import logging
import math
import random
from dataclasses import dataclass, field
from enum import Enum, auto

from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

logger = logging.getLogger("server")
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
    Stores and modifies the state of the game.
    """

    game_id: str = "No id"
    bumper_1: Bumper
    bumper_2: Bumper
    ball: Ball
    state: PongMatchState
    scored_last: Bumper | None = None
    someone_scored: bool
    pause = asyncio.Event

    def __init__(self, game_id: str):
        self.game_id = game_id
        self.bumper_1 = Bumper(
            *STARTING_BUMPER_1_POS,
            dir_z=1,
        )
        self.bumper_2 = Bumper(
            *STARTING_BUMPER_2_POS,
            dir_z=-1,
        )
        self.ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))
        self.is_someone_scored = False
        self.state = PongMatchState.PENDING
        self.pause = asyncio.Event()

    def __str__(self):
        return self.game_id

    def __repr__(self):
        return f"{self.state.name.capitalize()} game {self.game_id}"

    def as_dict(self):
        return {
            "bumper_1": {"x": self.bumper_1.x, "z": self.bumper_1.z},
            "bumper_2": {"x": self.bumper_2.x, "z": self.bumper_2.z},
            "ball": {
                "x": self.ball.x,
                "z": self.ball.z,
                "velocity": {"x": self.ball.velocity.x, "z": self.ball.velocity.z},
            },
            "scored_last": self.scored_last.id if self.scored_last else None,
            "is_someone_scored": self.is_someone_scored,
        }

    def handle_input(self, player_id: str, action: str, content: bool):
        if player_id == self.bumper_1.player.id:
            bumper = self.bumper_1
        elif player_id == self.bumper_2.player.id:
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
            self.is_someone_scored = True
        elif self.ball.z <= BUMPER_1_BORDER:
            self.bumper_2.score += 1
            self._reset_ball(1)
            self.is_someone_scored = True

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
        Adds player to the players dict.
        Assigns player to a random bumper.
        """
        available_player_slots = []
        if self.bumper_1.player.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self.bumper_1)
        if self.bumper_2.player.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self.bumper_2)
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
        return [p for p in [self.bumper_1.player, self.bumper_2.player] if p.connection == connection]

    def get_player(self, player_id: str) -> Player | None:
        if self.bumper_1.player.id == player_id:
            return self.bumper_1.player
        if self.bumper_2.player.id == player_id:
            return self.bumper_2.player
        return None

    def get_other_player(self, player_id: str) -> Player:
        if player_id == self.bumper_1.player.id:
            return self.bumper_1.player
        return self.bumper_2.player


class GameConsumer(AsyncConsumer):
    def __init__(self):
        super().__init__()
        self.matches: dict[str, PongMatch] = {}
        self.matches_tasks: dict[str, asyncio.Task] = {}
        self.timer_tasks: dict[str, asyncio.Task] = {}
        self.channel_layer = get_channel_layer()

    def _to_group_name(self, game_room_id: str):
        """Little function for avoiding typing errors."""
        return f"game_room_{game_room_id}"

    async def player_connected(self, event: dict):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]

        ### CONNECTION OF THE FIRST PLAYER TO NOT YET CREATED MATCH ###
        if game_room_id not in self.matches:
            self.matches[game_room_id] = PongMatch(game_room_id)
            self.matches[game_room_id].add_player(player_id)
            # TODO: create a timer that gives the other player 5 seconds to connect
            self.timer_tasks["waiting_" + game_room_id] = asyncio.create_task(self._wait_for_both_player(game_room_id))
            logger.info("[GameWorker]: player {%s} was added to newly created game {%s}", player_id, game_room_id)
            return

        match = self.matches[game_room_id]

        ### CONNECTION OF THE SECOND PLAYER TO THE PENDING MATCH ###
        if (
            match.state == PongMatchState.PENDING
            and len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) == PLAYERS_REQUIRED - 1
        ):
            match.add_player(player_id)
            self.timer_tasks["waiting_" + game_room_id].cancel()
            self.matches_tasks[game_room_id] = asyncio.create_task(self._start_match_game_loop(game_room_id))
            logger.info("[GameWorker]: player {%s} has been added to existing game {%s}", player_id, game_room_id)

        ### RECONNECTION OF ONE OF THE PLAYERS TO THE MATCH ###
        elif match.state in {PongMatchState.PENDING, PongMatchState.ONGOING, PongMatchState.PAUSED}:
            player = match.get_player(player_id)
            if not player:
                logger.warning(
                    "[GameWorker]: illegal player {%s} tried to connect to the ongoing game {%s}",
                    player_id,
                    game_room_id,
                )
                return
            pause_task = self.timer_tasks.get(f"reconnection_wait_{game_room_id}_{player.id}")
            if pause_task and not pause_task.cancelled():
                pause_task.cancel()
                self.timer_tasks.pop(f"reconnection_wait_{game_room_id}_{player.id}")
            player.connection = PlayerConnectionState.CONNECTED
            match.pause.set()
            # TODO: reconnection logic
            logger.info("[GameWorker]: player {%s} has been reconnected to the game {%s}", player_id, game_room_id)

    # TODO: give 10 seconds to disconnected player to reconnect. if they can't do it, remaining player wins
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
        match.state = PongMatchState.PAUSED
        match.pause.clear()
        self.timer_tasks[f"reconnection_wait_{game_room_id}_{disconnected_player.id}"] = asyncio.create_task(
            self._wait_for_reconnection(match, disconnected_player),
        )

        if not match.get_players_based_on_connection(PlayerConnectionState.CONNECTED):
            self._end_match(game_room_id)
            # TODO: add the match result to the db
            logger.info("[GameWorker]: no players are left in the game {%s}. Closing", game_room_id)

    async def _start_match_game_loop(self, game_room_id: str):
        """Asynchrounous loop that runs one specific match."""
        match = self.matches[game_room_id]
        match.state = PongMatchState.ONGOING
        logger.info("[GameWorker]: match {%s} has been started", game_room_id)
        try:
            # TODO: tweak the condition for the running of the game loop
            while match.state != PongMatchState.ENDED:
                if match.state == PongMatchState.PAUSED:
                    await match.pause.wait()
                match.someone_scored = False
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
                self._end_match(game_room_id)
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
                    "[GameWorker]: {%s} seconds left for player {%s}",
                    player.reconnection_time,
                    player.id,
                )

            if match.state == PongMatchState.ENDED:
                logger.warning(
                    "[GameWorker]: players didn't reconnect to non-existent or ended game {%s}. Closing",
                    match,
                )
                return

            self._end_match(match)

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

    def _end_match(self, game_room_id: str):
        """Cleans up after the match. Stops its game loop, removes from `matches` and `tasks` dicts."""
        match_task = self.matches_tasks.get(game_room_id)
        if match_task and not match_task.cancelled():
            match_task.cancel()
        self.matches.pop(game_room_id, None)
        self.matches_tasks.pop(game_room_id, None)
