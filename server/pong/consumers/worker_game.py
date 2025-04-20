import asyncio
import hashlib
import json
import math
import os
from dataclasses import dataclass

from channels.generic.websocket import AsyncConsumer

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
    user_id: str
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
        user_id="",
        player_id="",
    )
    bumper_2: Bumper = Bumper(
        *STARTING_BUMPER_2_POS,
        score=0,
        moves_left=False,
        moves_right=False,
        dir_z=-1,
        user_id="",
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


"""
--normal mode--
on connection: when the player joins the game
player receives id for specific match id
player waits for other player to join
client sends: {nothing}
server sends: {player_id: string}

countdown started: when two players joined the game
when the second player joined the game
receives initial state and starts the countdown
client sends: {nothing}
server sends: {state: state}

game is running:
client sends: {inputs: inputs, player_id: string}
server sends: {state: state}

game is ended:
client sends: {nothing}
server sends: {winner: Profile}


--cool mode--
on connection: when the player joins the game
player receives id for specific match id
player waits for other player to join
client sends: {nothing}
server sends: {player_id: string}

countdown started: when two players joined the game
when the second player joined the game
receives initial state and starts the countdown
client sends: {nothing}
server sends: {state: state}

game is running:
client sends: {inputs: inputs, player_id: string} (add revolver angle to input)
server sends: {state: state} (add coin pos, revolver_bullet pos/velocity to state)

game is ended:
client sends: {nothing}
server sends: {winner: Profile}

"""


"""
user connects

we search in players for the id of the user

if there is one, we reuse that

otherwise if there are no more than two players, we generate a new player id and add it to the players:
    {user_id:player_id} -> add it to the list of players -> send it to client

otherwise disconnect

on each input client sends it back
clients disconnects
"""

"""
1. store the state in the database
2. synchronize the state between players
"""
MAX_PLAYERS = 2
player_ids = {}
bumpers = {}


def is_player_in_the_game(user_id: str):
    return any(user_id == player for player in player_ids)

class GameConsumer(AsyncConsumer):
    def __init__(self):
        super().__init__()
        self.matches = {}
        self.players = {}

    async def match_start(self, event):
        game_room_id = event["game_room_id"]
        player_id = event["player_id"]
        if self.players[game_room_id]:
            self.players[game_room_id].append()
        else:
            self.players[game_room_id] = [player_id]

        if game_room_id in self.matches:
            return

        self.matches[game_room_id] = Pong()

    async def connect(self):
        self.match_name = self.scope["url_route"]["kwargs"]["match_name"]
        self.match_group_name = f"match_{self.match_name}"
        self.user = self.scope.get("user")

        if not self.user:
            await self.close(1000)
            return

        self.user_id = str(self.user.id)
        is_in_game = is_player_in_the_game(self.user_id)

        if not is_in_game and len(player_ids) > MAX_PLAYERS:
            await self.close(1000)
            return

        await self.accept()
        await self.channel_layer.group_add(self.match_group_name, self.channel_name)
        self.state = Pong()
        if not is_in_game:
            player_ids[self.user_id] = hashlib.sha256(os.urandom(32)).hexdigest()
            if len(player_ids) == 1:
                self.state.bumper_1.user_id = self.user_id
                self.state.bumper_1.player_id = player_ids[self.user_id]
                set_bumper(self.user_id, self.state.bumper_1)
            elif len(player_ids) == MAX_PLAYERS:
                self.state.bumper_2.user_id = self.user_id
                self.state.bumper_2.player_id = player_ids[self.user_id]
                set_bumper(self.user_id, self.state.bumper_2)

        await self.send(text_data=json.dumps({"event": "joined", "player_id": player_ids[self.user_id]}))

        if len(player_ids) == MAX_PLAYERS:
            await self.channel_layer.group_send(
                self.match_group_name,
                {"type": "state_update", "state": self.state.as_dict()},
            )
            asyncio.create_task(self.timer())

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.match_group_name, self.channel_name)

    async def receive(self, text_data):
        if len(player_ids) != MAX_PLAYERS:
            return
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        match action:
            case "move_left" | "move_right":
                player_id, content = text_data_json["player_id"], text_data_json["content"]
                if not bumpers.get(player_id):
                    await self.disconnect(1000)
                self.state.handle_input(player_id, action, content)

    def calculate_sleeping_time(self):
        return 0.015

    async def timer(self):
        while len(player_ids) == MAX_PLAYERS:
            await asyncio.sleep(self.calculate_sleeping_time())
            await self.game_tick()

    async def state_update(self, event):
        await self.send(text_data=json.dumps({"event": "game_tick", "state": self.state.as_dict()}))
        self.state.someone_scored = False

    async def game_tick(self):
        self.state.resolve_next_tick()
        await self.channel_layer.group_send(self.match_group_name, {"type": "state_update"})

