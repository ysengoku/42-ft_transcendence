import asyncio
import logging
import math
import random
from dataclasses import dataclass
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
SCORE_TO_WIN = 3
###################


class MultiplayerPongMatchState(Enum):
    PENDING = auto()
    ONGOING = auto()
    PAUSED = auto()
    ENDED = auto()


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

    def stop_waiting_for_reconnection_timer(self):
        task = self.reconnection_timer
        if task and not task.cancelled():
            task.cancel()
        self.reconnection_timer = None

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
        self._coin = Coin(
            *STARTING_COIN_POS,
            Vector2(*STARTING_COIN_VELOCITY)
        )
        self._is_someone_scored = False
        self._last_bumper_collided = ""
        self._choose_buff = -1
        self._bumper_1 = Bumper(
            *STARTING_BUMPER_1_POS,
            dir_z=1,
        )
        self._bumper_2 = Bumper(
            *STARTING_BUMPER_2_POS,
            dir_z=-1,
        )
        self._ball = Ball(*STARTING_BALL_POS, Vector2(*STARTING_BALL_VELOCITY), Vector2(*TEMPORAL_SPEED_DEFAULT))

# Workers[0].onmessage = function(e) {
#       Bumpers[e.data[0]].cubeMesh.scale.x = 1;
#       Bumpers[e.data[0]].lenghtHalf = 2.5;
#     };
#     Workers[1].onmessage = function(e) {
#       Bumpers[Math.abs(e.data[0] - 1)].cubeMesh.scale.x = 1;
#       Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf = 2.5;
#       if ((Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf)) {
#         Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf - 0.1;
#       }
#       else if (Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf){
#           Bumpers[Math.abs(e.data[0] - 1)].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[Math.abs(e.data[0] - 1)].lenghtHalf + 0.1;
#       }
#     };
#     Workers[2].onmessage = function(e) {
#       Bumpers[Math.abs(e.data[0] - 1)].controlReverse = false;
#     };
#     Workers[3].onmessage = function(e) {
#       Bumpers[[Math.abs(e.data[0] - 1)]].speed = 0.25;
#     };
#     Workers[4].onmessage = function(e) {
#       Bumpers[e.data[0]].cubeMesh.scale.z = 1;
#       Bumpers[e.data[0]].widthHalf = 0.5;
#     };
#     Workers[5].onmessage = function(e) {
#       Coin.cylinderUpdate.set(-9.25, 3, 0);
#     };





#   if (isCoinCollidedWithBall(Coin, ballSubtickZ, ballSubtickX)) {
#     manageBuffAndDebuff();
#    }
#           if ((Coin.cylinderUpdate.x < -10 + WALL_WIDTH_HALF + Coin.lenghtHalf) || (Coin.cylinderUpdate.x > 10 - WALL_WIDTH_HALF - Coin.lenghtHalf)) {
#             Coin.velocity.x *= -1
#           }
#           Coin.cylinderUpdate.x += Coin.velocity.x;

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
        bumper_subtick = BUMPER_SPEED / total_subticks
        while current_subtick <= total_subticks:
            self._check_ball_wall_collision()
            self._check_ball_bumper_collision(ball_subtick_z, ball_subtick_x)
            self._check_ball_coin_collision(ball_subtick_z, ball_subtick_x)
            self._check_ball_scored()
            self._move_bumpers(bumper_subtick)
            self._move_ball(ball_subtick_z, ball_subtick_x)
            self._move_coin()

            current_subtick += 1

    def as_dict(self):
        """
        Serializes the game state as Python dict for using it for some other purpose, like rendering or sending
        through websockets.
        """
        return {
            "bumper_1": {"x": self._bumper_1.x, "z": self._bumper_1.z, "score": self._bumper_1.score},
            "bumper_2": {"x": self._bumper_2.x, "z": self._bumper_2.z, "score": self._bumper_2.score},
            "ball": {"x": self._ball.x, "z": self._ball.z},
            "coin": {"x": self._coin.x, "z": self._coin.z},
            "is_someone_scored": self._is_someone_scored,
            "last_bumper_collided": self._last_bumper_collided,
            "current_buff_or_debuff": self._choose_buff,
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

#     function isCoinCollidedWithBall(coin, ballSubtickZ, ballSubtickX) {
#       return (
#           (Ball.sphereUpdate.x - BALL_RADIUS + ballSubtickX * Ball.velocity.x <= coin.cylinderUpdate.x + 0.25)
#           && (Ball.sphereUpdate.x + BALL_RADIUS + ballSubtickX * Ball.velocity.x >= coin.cylinderUpdate.x - 0.25)
#           && (Ball.sphereUpdate.z - BALL_RADIUS + ballSubtickZ * Ball.velocity.z <= coin.cylinderUpdate.z + 0.05)
#           && (Ball.sphereUpdate.z + BALL_RADIUS + ballSubtickZ * Ball.velocity.z >= coin.cylinderUpdate.z - 0.05));
#   }

    def _is_collided_with_coin(self, ball_subtick_z, ball_subtick_x):
        """
        Calculates rectangle-on-rectangle collision between the ball and the coin.
        """
        return (
            (self._ball.x - BALL_RADIUS + ball_subtick_x * self._ball.velocity.x <= self._coin.x + 0.25)
            and (self._ball.x + BALL_RADIUS + ball_subtick_x * self._ball.velocity.x >= self._coin.x - 0.25)
            and (self._ball.z - BALL_RADIUS + ball_subtick_z * self._ball.velocity.z <= self._coin.z + 0.05)
            and (self._ball.z + BALL_RADIUS + ball_subtick_z * self._ball.velocity.z >= self._coin.z - 0.05)
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
            self._last_bumper_collided = "_bumper_1"
            self._calculate_new_dir(self._bumper_1)
        elif self._ball.velocity.z > 0 and self._is_collided_with_ball(self._bumper_2, ball_subtick_z, ball_subtick_x):
            self._last_bumper_collided = "_bumper_2"
            self._calculate_new_dir(self._bumper_2)

# function  manageBuffAndDebuff() {
#       let _chooseBuff = Math.floor(Math.random() * 5);
#       switch (_chooseBuff)
#       {
#         case 1:
#           Bumpers[lastBumperCollided].cubeMesh.scale.x = 2;
#           Bumpers[lastBumperCollided].lenghtHalf = 5;
#           if ((Bumpers[lastBumperCollided].cubeUpdate.x < -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf)) {
#               Bumpers[lastBumperCollided].cubeUpdate.x = -10 + WALL_WIDTH_HALF + Bumpers[lastBumperCollided].lenghtHalf - 0.1;
#           }
#           else if (Bumpers[lastBumperCollided].cubeUpdate.x > 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf){
#               Bumpers[lastBumperCollided].cubeUpdate.x = 10 - WALL_WIDTH_HALF - Bumpers[lastBumperCollided].lenghtHalf + 0.1;
#           }
#           Workers[0].postMessage([10000, lastBumperCollided, "create"]);
#           break ;
#         case 2:
#           Bumpers[Math.abs(lastBumperCollided - 1)].cubeMesh.scale.x = 0.5;
#           Bumpers[Math.abs(lastBumperCollided - 1)].lenghtHalf = 1.25;
#           Workers[1].postMessage([10000, lastBumperCollided, "create"]);
#           break ;
#         case 3:
#           Bumpers[Math.abs(lastBumperCollided - 1)].controlReverse = true;
#           Workers[2].postMessage([2000, lastBumperCollided, "create"]);
#           break ;
#         case 4:
#           Bumpers[Math.abs(lastBumperCollided - 1)].speed = 0.1;
#           Workers[3].postMessage([5000, lastBumperCollided, "create"]);
#           break ;
#         default:
#           Bumpers[lastBumperCollided].cubeMesh.scale.z = 3;
#           Bumpers[lastBumperCollided].widthHalf = 1.5;
#           Workers[4].postMessage([10000, lastBumperCollided, "create"]);
#           break ;
#       }
#       Coin.cylinderUpdate.set(-100, 3, 0);
#       Workers[5].postMessage([30000, -1, "create"]);
#     }


    def _manage_buff_and_debuff(self, last_bumper_collided):
        # print(self._ball.x)
        self._choose_buff = random.randrange(5)
        match self._choose_buff:
            case 0:
                self.__dict__[last_bumper_collided].lenght_half = 5
                if ((self.__dict__[last_bumper_collided].x < -10 + WALL_WIDTH_HALF + self.__dict__[last_bumper_collided].lenght_half)) :
                    self.__dict__[last_bumper_collided].x = -10 + WALL_WIDTH_HALF + self.__dict__[last_bumper_collided].lenght_half - 0.1
                elif (self.__dict__[last_bumper_collided].x > 10 - WALL_WIDTH_HALF - self.__dict__[last_bumper_collided].lenght_half) :
                    self.__dict__[last_bumper_collided].x = 10 - WALL_WIDTH_HALF - self.__dict__[last_bumper_collided].lenght_half + 0.1
                
            case 1:
                last_bumper_collided = "_bumper_1" if last_bumper_collided == "_bumper_2" else "_bumper_2"
                self.__dict__[last_bumper_collided].lenght_half = 1.25
                
            case 2:
                last_bumper_collided = "_bumper_1" if last_bumper_collided == "_bumper_2" else "_bumper_2"
                self.__dict__[last_bumper_collided].control_reversed = true
                
            case 3:
                last_bumper_collided = "_bumper_1" if last_bumper_collided == "_bumper_2" else "_bumper_2"
                self.__dict__[last_bumper_collided].speed = 0.1
                
            case 4:
                self.__dict__[last_bumper_collided].width_half = 1.5

        self._coin.x, self._coin.z = -100, 1
            # case 5:
                
                #Bumpers[last_bumper_collided].cubeMesh.scale.x = 2;
                #Bumpers[last_bumper_collided].lenghtHalf = 5;
                # Workers[0].postMessage([10000, lastBumperCollided, "create"]);
                # break ;


    def _check_ball_coin_collision(self, ball_subtick_z, ball_subtick_x):
        if self._is_collided_with_coin(ball_subtick_z, ball_subtick_x):
            self._manage_buff_and_debuff(self._last_bumper_collided)

    def _move_bumpers(self, bumper_subtick):
        if self._bumper_1.moves_left and not self._bumper_1.x > WALL_LEFT_X - WALL_WIDTH_HALF - self._bumper_1.lenght_half:
            self._bumper_1.x += bumper_subtick
        if self._bumper_1.moves_right and not self._bumper_1.x < WALL_RIGHT_X + WALL_WIDTH_HALF + self._bumper_1.lenght_half:
            self._bumper_1.x -= bumper_subtick

        if self._bumper_2.moves_left and not self._bumper_2.x > WALL_LEFT_X - WALL_WIDTH_HALF - self._bumper_2.lenght_half:
            self._bumper_2.x += bumper_subtick
        if self._bumper_2.moves_right and not self._bumper_2.x < WALL_RIGHT_X + WALL_WIDTH_HALF + self._bumper_2.lenght_half:
            self._bumper_2.x -= bumper_subtick

    def _move_ball(self, ball_subtick_z, ball_subtick_x):
        self._ball.z += ball_subtick_z * self._ball.velocity.z
        self._ball.x += ball_subtick_x * self._ball.velocity.x

    def _move_coin(self):
        if ((self._coin.x < -10 + WALL_WIDTH_HALF + 0.25) or (self._coin.x  > 10 - WALL_WIDTH_HALF - 0.25)) :
            self._coin.velocity.x *= -1
        self._coin.x += self._coin.velocity.x;

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
    state: MultiplayerPongMatchState = MultiplayerPongMatchState.PENDING
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
        return f"{self.state.name.capitalize()} game {self.id}"

    def handle_input(self, player_id: str, action: str, content: bool):
        if player_id == self._player_1.id:
            bumper = self._player_1.bumper
        elif player_id == self._player_2.id:
            bumper = self._player_2.bumper
        else:
            return

        match action:
            case "move_left":
                bumper.moves_left = content
            case "move_right":
                bumper.moves_right = content

    def add_player(self, player_id: str):
        """
        Adds player to the players dict.
        Assigns player to a random bumper.
        """
        available_player_slots = []
        if self._player_1.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._player_1)
        if self._player_2.connection == PlayerConnectionState.NOT_CONNECTED:
            available_player_slots.append(self._player_2)
        if not available_player_slots:
            return

        random.shuffle(available_player_slots)
        player = available_player_slots.pop()
        player.id = player_id
        player.connection = PlayerConnectionState.CONNECTED
        if player.bumper.dir_z == 1:
            logger.info("[GameWorker]: player {%s} was assigned to player_1", player_id)
        if player.bumper.dir_z == -1:
            logger.info("[GameWorker]: player {%s} was assigned to player_2", player_id)

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

    def get_winner(self) -> Player | None:
        if self._player_1.bumper.score >= SCORE_TO_WIN:
            return self._player_1
        if self._player_2.bumper.score >= SCORE_TO_WIN:
            return self._player_2
        return None


class GameConsumer(AsyncConsumer):
    """
    Manages multiple concurrent pong matches. Receives inputs from `GameRoomConsumer` and sends back different events
    based on what happened in the match.
    """

    def __init__(self):
        super().__init__()
        self.matches: dict[str, MultiplayerPongMatch] = {}
        self.channel_layer = get_channel_layer()

    ##### EVENT HANDLERS AND CHANNEL METHODS #####
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
            match.state == MultiplayerPongMatchState.PENDING
            and len(match.get_players_based_on_connection(PlayerConnectionState.CONNECTED)) == PLAYERS_REQUIRED - 1
        ):
            self._add_player_and_start_match(player_id, match)

        ### RECONNECTION OF ONE OF THE PLAYERS TO THE MATCH ###
        elif match.state in {MultiplayerPongMatchState.PENDING, MultiplayerPongMatchState.PAUSED}:
            await self._reconnect_player(player_id, match)

    async def player_disconnected(self, event: dict):
        match_id = event["game_room_id"]
        player_id = event["player_id"]

        match = self.matches.get(match_id)
        if match is None or match.state == MultiplayerPongMatchState.ENDED:
            logger.warning(
                "[GameWorker]: player {%s} disconnected from the non-existent or ended game {%s}",
                player_id,
                match_id,
            )
            return

        player = match.get_player(player_id)
        if player is None:
            logger.warning(
                "[GameWorker]: disconnected player {%s} not found in the game {%s}",
                player_id,
                match_id,
            )
            return

        player.connection = PlayerConnectionState.DISCONNECTED
        if match.state == MultiplayerPongMatchState.PENDING:
            logger.info(
                "[GameWorker]: player {%s} has been disconnected from the pending game {%s}",
                player_id,
                match_id,
            )
            return

        await self._pause(match)
        player.reconnection_timer = asyncio.create_task(self._wait_for_reconnection_task(match, player))
        logger.info(
            "[GameWorker]: player {%s} has been disconnected from the ongoing game {%s}",
            player_id,
            match_id,
        )

        # TODO: handle the case where both players disconnect
        if not match.get_players_based_on_connection(PlayerConnectionState.CONNECTED):
            self._cleanup_match(match)
            # TODO: add the match result to the db
            logger.info("[GameWorker]: no players are left in the game {%s}. Closing", match_id)

    async def player_inputed(self, event: dict):
        """
        Handles player input. There is no validation of the input, because it is a worker,
        and event source is the server, which we can trust.
        """
        match_id = event["game_room_id"]
        match = self.matches.get(match_id)
        if match is None or match.state != MultiplayerPongMatchState.ONGOING:
            logger.warning("[GameWorker]: input was sent for not running game {%s}", match_id)

        player_id = event["player_id"]
        action = event["action"]
        content = event["content"]

        match action:
            case "move_left" | "move_right":
                match.handle_input(player_id, action, content)

    ##### BACKGROUND TASKS #####
    async def _match_game_loop_task(self, match: MultiplayerPongMatch):
        """Asynchrounous loop that runs one specific match."""
        logger.info("[GameWorker]: match {%s} has been started", match)
        try:
            while match.state != MultiplayerPongMatchState.ENDED:
                if match.state == MultiplayerPongMatchState.PAUSED:
                    await match.pause_event.wait()
                tick_start_time = asyncio.get_event_loop().time()
                match.resolve_next_tick()
                if winner := match.get_winner():
                    await self.channel_layer.group_send(
                        self._to_group_name(match),
                        {"type": "player_won", "winner": winner.id},
                    )
                    logger.info("[GameWorker]: player {%s} has won the game {%s}", winner.id, match)
                    break
                await self.channel_layer.group_send(
                    self._to_group_name(match.id),
                    {"type": "state_updated", "state": match.as_dict()},
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
                self._cleanup_match(match)
                await self.channel_layer.group_send(self._to_group_name(match), {"type": "game_cancelled"})
                logger.info("[GameWorker]: players didn't connect to the game {%s}. Closing", match)

        except asyncio.CancelledError:
            logger.info("[GameWorker]: task for timer {%s} has been cancelled", match)

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

            if match.state == MultiplayerPongMatchState.ENDED:
                return logger.warning(
                    "[GameWorker]: players didn't reconnect to non-existent or ended game {%s}. Closing",
                    match,
                )

            self._cleanup_match(match)
            match.state = MultiplayerPongMatchState.ENDED
            winner = match.get_other_player(player.id)
            await self.channel_layer.group_send(
                self._to_group_name(match),
                {"type": "player_resigned", "winner": winner.id},
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
    def _add_player_and_create_pending_match(self, player_id: str, match_id: str):
        match = self.matches[match_id] = MultiplayerPongMatch(match_id)
        match.add_player(player_id)
        match.waiting_for_players_timer = asyncio.create_task(self._wait_for_both_player_task(match))
        logger.info("[GameWorker]: player {%s} was added to newly created game {%s}", player_id, match_id)

    def _add_player_and_start_match(self, player_id: str, match: MultiplayerPongMatch):
        """Cancels waiting for players timer, and starts the game loop for this match."""
        match.add_player(player_id)
        match.stop_waiting_for_players_timer()
        match.state = MultiplayerPongMatchState.ONGOING
        match.game_loop_task = asyncio.create_task(self._match_game_loop_task(match))
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
        await self._unpause(match)
        logger.info("[GameWorker]: player {%s} has been reconnected to the game {%s}", player_id, match.id)

    ##### MATCH MANAGEMENT METHODS #####
    def _cleanup_match(self, match: MultiplayerPongMatch):
        """Cleans up after the match. Stops its game loop, removes from `matches` and `tasks` dicts."""
        self.matches.pop(str(match), None)
        if match.game_loop_task and not match.game_loop_task.cancelled():
            match.game_loop_task.cancel()

    async def _pause(self, match: MultiplayerPongMatch):
        await self.channel_layer.group_send(self._to_group_name(match), {"type": "game_paused"})
        match.state = MultiplayerPongMatchState.PAUSED
        match.pause_event.clear()
        logger.info("[GameWorker]: game {%s} has been paused", match.id)

    async def _unpause(self, match: MultiplayerPongMatch):
        await self.channel_layer.group_send(self._to_group_name(match), {"type": "game_unpaused"})
        match.state = MultiplayerPongMatchState.ONGOING
        if not match.pause_event.is_set():
            match.pause_event.set()
        logger.info("[GameWorker]: game {%s} has been unpaused", match.id)

    # To avoid typing errors.
    def _to_group_name(self, match: MultiplayerPongMatch):
        return f"game_room_{match}"
