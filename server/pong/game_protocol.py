"""
Contains typed definitions and enumerations required for the exchange of the data between the websocket server,
the game server and the client for the game of pong.
"""
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


class GameRoomSettings(TypedDict):
    """
    Options for the specific match of Pong.
    `score_to_win` ranges from 3 to 20.
    `time_limit`   ranges from 1 minute to 5 minutes.
    `cool_mode`    activates the coin with different buffs/debuffs.
    """

    score_to_win: int
    time_limit: int
    cool_mode: bool
    ranked: bool
    game_speed: Literal["slow", "medium", "fast"]


class SerializedGameState(TypedDict):
    """State of the particular pong game represented in the JSON format."""

    class _Bumper(TypedDict):
        x: float
        z: float
        score: int

    class _Ball(TypedDict):
        x: float
        z: float

    bumpter_1: _Bumper
    bumpter_2: _Bumper
    ball: _Ball
    is_someone_scored: bool


class MatchmakingToClientEvents:
    class GameFound(TypedDict):
        """Matchmaking found two players to play against each other."""

        action: Literal["game_found"]
        game_room_id: str
        username: str
        nickname: str
        avatar: str
        elo: int


class MatchmakingFromClientEvents:
    class Cancel(TypedDict):
        """Player cancelled his matchmaking search."""

        action: Literal["cancel"]


class GameWSServerToClientEvents:
    class PlayerJoined(TypedDict):
        """Player joined the game, and received its unique id for the identification purposes."""

        action: Literal["player_joined"]
        player_id: str

    class GameCancelled(TypedDict):
        """Both of the players failed to connect to the game, so it was cancelled."""

        action: Literal["game_cancelled"]

    class GameStarted(TypedDict):
        """Both of the players joined the game and it started."""

        action: Literal["game_started"]

    class StateUpdated(TypedDict):
        """Game server calculated the game tick and sends the updated state."""

        action: Literal["state_updated"]
        state: SerializedGameState

    class GamePaused(TypedDict):
        """Game is paused due to one of the players disconnecting from the game."""

        action: Literal["game_paused"]
        remaining_time: int
        name: str

    class GameUnpaused(TypedDict):
        """Game is unpaused. One of the players managed to reconnect."""

        action: Literal["game_unpaused"]

    class PlayerWon(TypedDict):
        """One of the the player has won. Contains profile data of winner and loser, as well as the change in elo."""

        class _Player(TypedDict):
            name: str
            avatar: str
            elo: int
            number: Literal[1, 2]

        winner: _Player
        loser: _Player
        elo_change: int

    class PlayerResigned(PlayerWon):
        """When the player has resigned. Contains the same data as `PlayerWon`."""


class GameWSServerFromClientEvents:
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


class GameWSServerToGameWorkerEvents:
    class PlayerConnected(TypedDict):
        """Player is connected to websocket server, and it sends the player information to the worker."""

        type: Literal["player_connected"]
        game_room_id: str
        player_id: str
        profile_id: str
        name: str
        avatar: str
        elo: int

    class PlayerDisconnected(TypedDict):
        """Player is disconnected from the websocket server, and it sends the relevant IDs to the worker."""

        type: Literal["player_disconnected"]
        game_room_id: str
        player_id: str

    class PlayerInputed(TypedDict):
        """Player has inputed the controls, websocket server sends it to the game worker."""

        type: Literal["player_inputed"]
        action: Literal["move_left", "move_right"]
        game_room_id: str
        player_id: str
        content: bool
