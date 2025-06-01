from typing import Literal, TypedDict


class PongCloseCodes:
    """
    Shared enum between different consumers for definition the unified close codes.
    Normal closure     -> connection did its task normally and closed normally.
    Cancelled          -> connection was canceled by the server.
    Illegal connection -> user who is not authorized tried to connect.
    Bad data           -> server received ill-formed data.
    """

    NORMAL_CLOSURE = 3000
    CANCELLED = 3001
    ILLEGAL_CONNECTION = 3002
    BAD_DATA = 3100


class SerializedGameState(TypedDict):
    """State of the particular pong game represented in the JSON format."""

    class _Vector2(TypedDict):
        x: float
        z: float

    class _Bumper(_Vector2):
        score: int

    class _Ball(_Vector2):
        pass

    class _Coin(_Vector2):
        pass

    bumper_1: _Bumper
    bumper_2: _Bumper
    ball: _Ball
    coin: _Coin
    is_someone_scored: bool
    last_bumper_collided: Literal["_bumper_1", "_bumper_2"]
    current_buff_or_debuff: int


class MatchmakingToClient:
    class GameFound(TypedDict):
        """Matchmaking found two players to play against each other."""

        action: Literal["game_found"]
        game_room_id: str
        username: str
        nickname: str
        avatar: str
        elo: int


class ClientToMatchmaking:
    class Cancel(TypedDict):
        """Player cancelled his matchmaking search."""

        action: Literal["cancel"]


class GameServerToClient:
    class WorkerToClientOpen(TypedDict):
        """Events sent from the worker to the client trough GameServer which don't close the connection."""

        type: Literal["worker_to_client_open"]

    class WorkerToClientClose(TypedDict):
        """Events sent from the worker to the client trough GameServer which close the connection."""

        type: Literal["worker_to_client_close"]
        close_code: PongCloseCodes

    class PlayerJoined(WorkerToClientOpen):
        """
        Player joined the game, and received number of their bumper as well as their unique id for the
        identification purposes.
        """

        action: Literal["player_joined"]
        player_id: str
        player_number: Literal[1, 2]
        is_paused: bool

    class GameCancelled(WorkerToClientClose):
        """Both of the players failed to connect to the game, so it was cancelled."""

        action: Literal["game_cancelled"]

    class GameStarted(WorkerToClientOpen):
        """Both of the players joined the game and it started."""

        action: Literal["game_started"]

    class StateUpdated(WorkerToClientOpen):
        """Game server calculated the game tick and sends the updated state."""

        action: Literal["state_updated"]
        state: SerializedGameState

    class GamePaused(WorkerToClientOpen):
        """Game is paused due to one of the players disconnecting from the game."""

        action: Literal["game_paused"]
        remaining_time: int
        name: str

    class GameUnpaused(WorkerToClientOpen):
        """Game is unpaused. One of the players managed to reconnect."""

        action: Literal["game_unpaused"]

    class PlayerWon(WorkerToClientClose):
        """One of the the player has won. Contains profile data of winner and loser, as well as the change in elo."""

        class _Player(TypedDict):
            name: str
            avatar: str
            elo: int
            player_number: Literal[1, 2]

        action: Literal["player_won"]
        winner: _Player
        loser: _Player
        elo_change: int

    class PlayerResigned(PlayerWon):
        """When the player has resigned. For example, by disconnect. Contains the same data as `PlayerWon`."""

        action: Literal["player_resigned"]

    class InputConfirmed(WorkerToClientOpen):
        """Server confirmation of the input from the player. Required for the client-side prediction."""

        action: Literal["move_left", "move_right"]
        content: int
        player_id: str
        position_x: float


class ClientToGameServer:
    class MoveLeft(TypedDict):
        """Player moves to the left."""

        content: bool
        player_id: str

    class MoveRight(TypedDict):
        """Player moves to the right."""

        content: bool
        player_id: str

    class Resign(TypedDict):
        """Player resigns."""

        player_id: str


class GameServerToGameWorker:
    class PlayerConnected(TypedDict):
        """Player is connected to websocket server, and it sends the player information to the worker."""

        type: Literal["player_connected"]
        game_room_id: str
        player_id: str
        profile_id: str
        name: str
        avatar: str
        elo: int

    class PlayerInputed(TypedDict):
        """Player has inputed the controls, websocket server sends it to the game worker."""

        type: Literal["player_inputed"]
        action: Literal["move_left", "move_right"]
        game_room_id: str
        player_id: str
        content: int

    class PlayerDisconnected(TypedDict):
        """Player is disconnected from the websocket server, and it sends the relevant IDs to the worker."""

        type: Literal["player_disconnected"]
        game_room_id: str
        player_id: str
