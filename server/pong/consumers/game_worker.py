import asyncio
import logging
import math
import random
from dataclasses import dataclass
from datetime import datetime
from enum import Enum, IntEnum, auto

from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

from pong.consumers.game_protocol import (
    GameServerToClient,
    GameServerToGameWorker,
    PongCloseCodes,
    SerializedGameState,
)

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
STARTING_COIN_POS = -9.25, 1
STARTING_COIN_VELOCITY = 0.01, 0
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
GAME_TICK_INTERVAL = 1.0 / 120
PLAYERS_REQUIRED = 2
SCORE_TO_WIN = 1000
DEFAULT_COIN_WAIT_TIME = 30
###################


class MultiplayerPongMatchStatus(Enum):
    PENDING = auto()
    ONGOING = auto()
    PAUSED = auto()
    ENDED = auto()


class Buffs(IntEnum):
    CONTROL_REVERSE_ENEMY = auto()
    SPEED_DECREASE_ENEMY = auto()
    SHORTEN_ENEMY = auto()
    ELONGATE_PLAYER = auto()
    ENLARGE_PLAYER = auto()
    SPAWN_COIN = auto()


class PlayerConnectionState(Enum):
    NOT_CONNECTED = auto()
    CONNECTED = auto()
    DISCONNECTED = auto()


@dataclass(slots=True)
class Vector2:
    x: float
    z: float


@dataclass(slots=True)
class Bumper(Vector2):
    dir_z: int
    width_half: int = 0.5
    lenght_half: int = 2.5
    score: int = 0
    speed: int = 0.25
    control_reversed: bool = False
    moves_left: bool = False
    moves_right: bool = False


@dataclass
class Player:
    bumper: Bumper
    id: str = ""
    connection: PlayerConnectionState = PlayerConnectionState.NOT_CONNECTED
    # TODO: move time to constants
    reconnection_time: int = 10
    reconnection_timer: asyncio.Task | None = None
    profile_id: str = ""
    name: str = ""
    avatar: str = ""
    elo: int = 0

    def stop_waiting_for_reconnection_timer(self):
        task = self.reconnection_timer
        if task and not task.cancelled():
            task.cancel()
        self.reconnection_timer = None

    def as_dict(self):
        return {
            "name": self.name,
            "avatar": self.avatar,
            "elo": self.elo,
            "player_number": 1 if self.bumper.z == 1 else 2,
        }


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

    _is_someone_scored: bool
    _bumper_1: Bumper
    _bumper_2: Bumper
    _ball: Ball

    def __init__(self):
        self.coin = Coin(
            *STARTING_COIN_POS,
            Vector2(*STARTING_COIN_VELOCITY),
        )
        self._is_someone_scored = False
        self.last_bumper_collided: Bumper | None = None
        self.choose_buff = 0
        self.time_to_wait = 0
        self._bumper_1 = Bumper(
            *STARTING_BUMPER_1_POS,
            dir_z=1,
        )
        self._bumper_2 = Bumper(
            *STARTING_BUMPER_2_POS,
            dir_z=-1,
        )
        self._ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))

    def resolve_next_tick(self):
        """
        The most important method of the engine. Advances the game by one tick.
        Moves the objects in the game by one subtick at a time.
        This approach is called Conservative Advancement.
        """
        self._is_someone_scored = False
        total_distance_x = abs((self._ball.temporal_speed.x) * self._ball.velocity.x)
        total_distance_z = abs((self._ball.temporal_speed.z) * self._ball.velocity.z)
        self._ball.temporal_speed.x = max(TEMPORAL_SPEED_DEFAULT[0], self._ball.temporal_speed.x - TEMPORAL_SPEED_DECAY)
        self._ball.temporal_speed.z = max(TEMPORAL_SPEED_DEFAULT[1], self._ball.temporal_speed.z - TEMPORAL_SPEED_DECAY)
        current_subtick = 0
        ball_subtick_z = SUBTICK
        total_subticks = total_distance_z / ball_subtick_z
        ball_subtick_x = total_distance_x / total_subticks
        bumper_1_subtick = self._bumper_1.speed / total_subticks
        bumper_2_subtick = self._bumper_2.speed / total_subticks
        self.choose_buff = 0
        while current_subtick <= total_subticks:
            self._check_ball_wall_collision()
            self._check_ball_bumper_collision(ball_subtick_z, ball_subtick_x)
            self._check_ball_coin_collision(ball_subtick_z, ball_subtick_x)
            self._check_ball_scored()
            self._move_bumpers(bumper_1_subtick, bumper_2_subtick)
            self._move_ball(ball_subtick_z, ball_subtick_x)
            self._move_coin()

            current_subtick += 1

    def as_dict(self) -> SerializedGameState:
        """
        Serializes the game state as Python dict for using it for some other purpose, like rendering or sending
        through websockets.
        """
        return {
            "bumper_1": {"x": self._bumper_1.x, "z": self._bumper_1.z, "score": self._bumper_1.score},
            "bumper_2": {"x": self._bumper_2.x, "z": self._bumper_2.z, "score": self._bumper_2.score},
            "ball": {"x": self._ball.x, "z": self._ball.z},
            "coin": {"x": self.coin.x, "z": self.coin.z},
            "is_someone_scored": self._is_someone_scored,
            "last_bumper_collided": "_bumper_1" if self.last_bumper_collided == self._bumper_1 else "_bumper_2",
            "current_buff_or_debuff": self.choose_buff,
        }

    ##### Private game logic functions where actual stuff happens. #####
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
            (self._ball.x - BALL_RADIUS + ball_subtick_x * self._ball.velocity.x <= bumper.x + bumper.lenght_half)
            and (self._ball.x + BALL_RADIUS + ball_subtick_x * self._ball.velocity.x >= bumper.x - bumper.lenght_half)
            and (self._ball.z - BALL_RADIUS + ball_subtick_z * self._ball.velocity.z <= bumper.z + bumper.width_half)
            and (self._ball.z + BALL_RADIUS + ball_subtick_z * self._ball.velocity.z >= bumper.z - bumper.width_half)
        )

    def _is_collided_with_coin(self, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the coin.
        """
        return (
            (self._ball.x - BALL_RADIUS + ball_subtick_x * self._ball.velocity.x <= self.coin.x + 0.25)
            and (self._ball.x + BALL_RADIUS + ball_subtick_x * self._ball.velocity.x >= self.coin.x - 0.25)
            and (self._ball.z - BALL_RADIUS + ball_subtick_z * self._ball.velocity.z <= self.coin.z + 0.05)
            and (self._ball.z + BALL_RADIUS + ball_subtick_z * self._ball.velocity.z >= self.coin.z - 0.05)
        )

    def _calculate_new_dir(self, bumper):
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
            self.last_bumper_collided = self._bumper_1
            self._calculate_new_dir(self._bumper_1)
        elif self._ball.velocity.z > 0 and self._is_collided_with_ball(self._bumper_2, ball_subtick_z, ball_subtick_x):
            self.last_bumper_collided = self._bumper_2
            self._calculate_new_dir(self._bumper_2)

    def _manage_buff_and_debuff(self):
        self.choose_buff = random.randrange(1, 6)  # noqa: S311

        match self.choose_buff:
            case Buffs.CONTROL_REVERSE_ENEMY:
                self.last_bumper_collided = (
                    self._bumper_1 if self.last_bumper_collided == self._bumper_2 else self._bumper_2
                )
                self.last_bumper_collided.control_reversed = True
                self.time_to_wait = 2

            case Buffs.SPEED_DECREASE_ENEMY:
                self.last_bumper_collided = (
                    self._bumper_1 if self.last_bumper_collided == self._bumper_2 else self._bumper_2
                )
                self.last_bumper_collided.speed = 0.1
                self.time_to_wait = 5

            case Buffs.SHORTEN_ENEMY:
                self.last_bumper_collided = (
                    self._bumper_1 if self.last_bumper_collided == self._bumper_2 else self._bumper_2
                )
                self.last_bumper_collided.lenght_half = 1.25
                self.time_to_wait = 10

            case Buffs.ELONGATE_PLAYER:
                self.last_bumper_collided.lenght_half = 5
                if self.last_bumper_collided.x < -10 + WALL_WIDTH_HALF + self.last_bumper_collided.lenght_half:
                    self.last_bumper_collided.x = -10 + WALL_WIDTH_HALF + self.last_bumper_collided.lenght_half - 0.1
                elif self.last_bumper_collided.x > 10 - WALL_WIDTH_HALF - self.last_bumper_collided.lenght_half:
                    self.last_bumper_collided.x = 10 - WALL_WIDTH_HALF - self.last_bumper_collided.lenght_half + 0.1
                self.time_to_wait = 10

            case Buffs.ENLARGE_PLAYER:
                self.last_bumper_collided.width_half = 1.5
                self.time_to_wait = 10

        self.coin.x, self.coin.z = -100, 1

    def _check_ball_coin_collision(self, ball_subtick_z, ball_subtick_x):
        if self._is_collided_with_coin(ball_subtick_z, ball_subtick_x):
            self._manage_buff_and_debuff()

    def _move_bumpers(self, bumper_1_subtick, bumper_2_subtick):
        if (
            self._bumper_1.moves_left
            and not self._bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - self._bumper_1.lenght_half
        ):
            self._bumper_1.x += bumper_1_subtick
        if (
            self._bumper_1.moves_right
            and not self._bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + self._bumper_1.lenght_half
        ):
            self._bumper_1.x -= bumper_1_subtick

        if (
            self._bumper_2.moves_left
            and not self._bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - self._bumper_2.lenght_half
        ):
            self._bumper_2.x += bumper_2_subtick
        if (
            self._bumper_2.moves_right
            and not self._bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + self._bumper_2.lenght_half
        ):
            self._bumper_2.x -= bumper_2_subtick

    def _move_ball(self, ball_subtick_z, ball_subtick_x):
        self._ball.z += ball_subtick_z * self._ball.velocity.z
        self._ball.x += ball_subtick_x * self._ball.velocity.x

    def _move_coin(self):
        if (self.coin.x < -10 + WALL_WIDTH_HALF + 0.25) or (self.coin.x > 10 - WALL_WIDTH_HALF - 0.25):
            self.coin.velocity.x *= -1
        self.coin.x += self.coin.velocity.x


class MultiplayerPongMatch(BasePong):
    """
    Adaptated interface for the pong engine for the purposes of being managed by the GameConsumer in concurrent manner
    for the purposes of being sent to the client via websockets.
    Connects the pong enging to actual players, their inputs and state. Manages players, their connection status,
    as well as the background tasks needed for the proper management of the game loop and connection/reconnection of
    the players.
    """

    id: str
    game_loop_task: asyncio.Task | None
    waiting_for_players_timer: asyncio.Task | None
    status: MultiplayerPongMatchStatus = MultiplayerPongMatchStatus.PENDING
    pause_event: asyncio.Event
    _player_1: Player
    _player_2: Player

    def __init__(self, game_id: str):
        super().__init__()
        self.id = game_id
        self.pause_event = asyncio.Event()
        self.game_loop_task = None
        self.waiting_for_players_timer = None
        self._player_1 = Player(self._bumper_1)
        self._player_2 = Player(self._bumper_2)

    def __str__(self):
        return self.id

    def __repr__(self):
        return f"{self.status.name.capitalize()} game {self.id}"

    def handle_input(self, action: str, player_id: str, content: int) -> tuple[Player, int] | None:
        if player_id == self._player_1.id:
            player = self._player_1
        elif player_id == self._player_2.id:
            player = self._player_2
        else:
            return None
        # if bumper.control_reversed is True:
        #     action = "move_left" if action == "move_right" else "move_right"
        bumper = player.bumper

        match action:
            case "move_left":
                bumper.moves_left = content > 0
                return player, content
            case "move_right":
                bumper.moves_right = content > 0
                return player, content

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
        player.connection = PlayerConnectionState.CONNECTED
        player.profile_id = player_connected_event["profile_id"]
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

    def get_player(self, player_id: str) -> Player | None:
        if self._player_1.id == player_id:
            return self._player_1
        if self._player_2.id == player_id:
            return self._player_2
        return None

    def get_other_player(self, player_id: str) -> Player:
        if player_id == self._player_1.id:
            return self._player_1
        return self._player_2

    def stop_waiting_for_players_timer(self) -> None:
        timer = self.waiting_for_players_timer
        if timer and not timer.cancelled():
            timer.cancel()
        self.waiting_for_players_timer = None

    def get_result(self) -> tuple[Player] | None:
        """Returns winner and loser or None, if the game is not decided yet."""
        if self._player_1.bumper.score >= SCORE_TO_WIN:
            return self._player_1, self._player_2
        if self._player_2.bumper.score >= SCORE_TO_WIN:
            return self._player_2, self._player_1
        return None


# Logic for client side prediction :
# - do inputs
# - send timestamp + control
# - get input and timestamp and put it inside an array on the server
# - do the actions with the timestamp, while sending the movement to only the right user. and confirmation of movement
# for the other one


# Logic for client side prediction :
# - do inputs
# - send timestamp + control
# - get input and timestamp and put it inside an array on the server
# - do the actions with the timestamp, while sending the movement to only the right user. and confirmation of movement
# for the other one


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
        if match is None or match.status == MultiplayerPongMatchStatus.ENDED:
            logger.warning(
                "[GameWorker]: player {%s} disconnected from the non-existent or ended game {%s}",
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

        match action:
            case "move_left" | "move_right":
                # TODO: what if player_id is empty
                result = match.handle_input(action, player_id, content)
                if not result:
                    return  # TODO: handle if it's None
                player, content = result

                await self.channel_layer.group_send(
                    self._to_game_room_group_name(match),
                    GameServerToClient.InputConfirmed(
                        type="worker_to_client_open",
                        action=action,
                        player_number=1 if player.bumper.dir_z == 1 else 2,
                        content=content,
                    ),
                )

    ##### BACKGROUND TASKS #####
    async def _match_game_loop_task(self, match: MultiplayerPongMatch):
        """Asynchrounous loop that runs one specific match."""
        logger.info("[GameWorker]: match {%s} has been started", match)
        try:
            while match.status != MultiplayerPongMatchStatus.ENDED:
                if match.status == MultiplayerPongMatchStatus.PAUSED:
                    await match.pause_event.wait()
                tick_start_time = asyncio.get_event_loop().time()
                match.resolve_next_tick()
                if match.choose_buff != 0:
                    asyncio.create_task(
                        self._wait_for_end_of_buff(match, match.last_bumper_collided),
                    )
                    asyncio.create_task(self._wait_for_end_of_buff(match, None))
                if result := match.get_result():
                    winner, loser = result
                    await self.channel_layer.group_send(
                        self._to_game_room_group_name(match),
                        GameServerToClient.PlayerWon(
                            type="worker_to_client_close",
                            action="player_won",
                            winner=winner.as_dict(),
                            loser=loser.as_dict(),
                            elo_change=100,  # TODO: insert actual elo change number
                            close_code=PongCloseCodes.NORMAL_CLOSURE,
                        ),
                    )
                    logger.info("[GameWorker]: player {%s} has won the game {%s}", winner.id, match)
                    break
                await self.channel_layer.group_send(
                    self._to_game_room_group_name(match.id),
                    GameServerToClient.StateUpdated(
                        type="worker_to_client_open",
                        action="state_updated",
                        state=match.as_dict(),
                    ),
                )
                tick_end_time = asyncio.get_event_loop().time()
                time_taken_for_current_tick = tick_end_time - tick_start_time
                # tick the game for this match 30 times a second
                await asyncio.sleep(max(GAME_TICK_INTERVAL - time_taken_for_current_tick, 0))
            logger.info("[GameWorker]: task for game {%s} has been done", match)
        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for game {%s} has been cancelled", match)

    async def _wait_for_both_player_task(self, match: MultiplayerPongMatch):
        """
        Called with `asyncio.create_task`. Waits for both players to be connected to the game.
        Cancels the game if the players do not manage to connect in time.
        """
        try:
            logger.info("[GameWorker]: waiting for players to connect to the game {%s}", match)
            await asyncio.sleep(5)
            if len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) < PLAYERS_REQUIRED:
                self._do_after_match_cleanup(match)
                await self.channel_layer.group_send(
                    self._to_game_room_group_name(match),
                    GameServerToClient.GameCancelled(
                        type="worker_to_client_close",
                        action="game_cancelled",
                        close_code=PongCloseCodes.CANCELLED,
                    ),
                )
                logger.info("[GameWorker]: players didn't connect to the game {%s}. Closing", match)

        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for timer {%s} has been cancelled", match)

    async def _wait_for_end_of_buff(self, match: MultiplayerPongMatch, last_bumper_collided: str):
        time_to_wait = match.time_to_wait if last_bumper_collided is not None else DEFAULT_COIN_WAIT_TIME
        choose_buff = match.choose_buff if last_bumper_collided is not None else Buffs.SPAWN_COIN
        while time_to_wait > 0:
            await asyncio.sleep(0.2)
            time_to_wait -= 0.2

        match choose_buff:
            case Buffs.CONTROL_REVERSE_ENEMY:
                match.last_bumper_collided.control_reversed = False
                match.choose_buff = -choose_buff

            case Buffs.SPEED_DECREASE_ENEMY:
                match.last_bumper_collided.speed = 0.25
                match.choose_buff = -choose_buff

            case Buffs.SHORTEN_ENEMY:
                match.last_bumper_collided.lenght_half = 2.5
                if match.last_bumper_collided.x < -10 + WALL_WIDTH_HALF + match.last_bumper_collided.lenght_half:
                    match.last_bumper_collided.x = -10 + WALL_WIDTH_HALF + match.last_bumper_collided.lenght_half - 0.1
                elif match.last_bumper_collided.x > 10 - WALL_WIDTH_HALF - match.last_bumper_collided.lenght_half:
                    match.last_bumper_collided.x = 10 - WALL_WIDTH_HALF - match.last_bumper_collided.lenght_half + 0.1
                match.choose_buff = -choose_buff

            case Buffs.ELONGATE_PLAYER:
                match.last_bumper_collided.lenght_half = 2.5
                match.choose_buff = -choose_buff

            case Buffs.ENLARGE_PLAYER:
                match.last_bumper_collided.width_half = 0.5
                match.choose_buff = -choose_buff

            case Buffs.SPAWN_COIN:
                match.coin.x, match.coin.z = STARTING_COIN_POS

            case _:
                logger.warning("No God")

        match.last_bumper_collided = last_bumper_collided
        await self.channel_layer.group_send(
            self._to_game_room_group_name(match.id),
            GameServerToClient.StateUpdated(
                type="worker_to_client_open",
                action="state_updated",
                state=match.as_dict(),
            ),
        )

    async def _wait_for_reconnection_task(self, match: MultiplayerPongMatch, player: Player):
        try:
            logger.info(
                "[GameWorker]: waiting for the player {%s} to connect to the game {%s}",
                match,
                player.id,
            )
            while player.reconnection_time > 0:
                await asyncio.sleep(0.2)
                player.reconnection_time -= 0.2
                logger.info("[GameWorker]: {%.1f} seconds left for player {%s}", player.reconnection_time, player.id)

            if match.status == MultiplayerPongMatchStatus.ENDED:
                return logger.warning(
                    "[GameWorker]: players didn't reconnect to non-existent or ended game {%s}. Closing",
                    match,
                )
                return None

            self._do_after_match_cleanup(match)
            match.status = MultiplayerPongMatchStatus.ENDED
            winner = match.get_other_player(player.id)
            await self.channel_layer.group_send(
                self._to_game_room_group_name(match),
                GameServerToClient.PlayerResigned(
                    type="worker_to_client_close",
                    action="player_resigned",
                    winner=winner.as_dict(),
                    loser=player.as_dict(),
                    elo_change=100,  # TODO: insert actual elo change number
                    close_code=PongCloseCodes.NORMAL_CLOSURE,
                ),
            )
            logger.info(
                "[GameWorker]: player {%s} resigned by disconnecting in the game {%s}. Winner is {%s}",
                player.id,
                match,
                winner.id,
            )

        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for timer {%s} has been cancelled", match)

    ##### PLAYER MANAGEMENT METHODS #####
    async def _add_player_and_create_pending_match(self, event: GameServerToGameWorker.PlayerConnected):
        player_id = event["player_id"]
        game_room_id = event["game_room_id"]
        match = self.matches[game_room_id] = MultiplayerPongMatch(game_room_id)
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
        # TODO: handle case when the player is None
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
        player.connection = PlayerConnectionState.CONNECTED
        player.stop_waiting_for_reconnection_timer()
        # TODO: do better reconnection logic
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
            ),
        )

    ##### MATCH MANAGEMENT METHODS #####
    def _do_after_match_cleanup(self, match: MultiplayerPongMatch):
        self.matches.pop(str(match), None)
        if match.game_loop_task and not match.game_loop_task.cancelled():
            match.game_loop_task.cancel()

    async def _pause(
        self,
        match: MultiplayerPongMatch,
        disconnected_player: Player,
    ):
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
        await self.channel_layer.group_send(
            self._to_game_room_group_name(match),
            GameServerToClient.GameUnpaused(type="worker_to_client_open", action="game_unpaused"),
        )
        match.status = MultiplayerPongMatchStatus.ONGOING
        if not match.pause_event.is_set():
            match.pause_event.set()
        logger.info("[GameWorker]: game {%s} has been unpaused", match.id)

    # To avoid typing errors.
    def _to_game_room_group_name(self, match: MultiplayerPongMatch):
        return f"game_room_{match}"

    def _to_player_group_name(self, player_id: str):
        return f"player_{player_id}"
