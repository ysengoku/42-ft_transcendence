"""
Contains typed definitions and enumerations required for the exchange of the data between the websocket server,
the game server and the client for the game of pong.
"""

from typing import Literal, TypedDict

from typing_extensions import NotRequired

from common.close_codes import CloseCodes


class GameRoomSettings(TypedDict):
    """
    Options for the specific match of Pong.
    `score_to_win` ranges from 3 to 20.
    `time_limit`   ranges from 1 minute to 5 minutes.
    `cool_mode`    activates the coin with different buffs/debuffs.
    """

    score_to_win: NotRequired[int]
    time_limit: NotRequired[int]
    cool_mode: NotRequired[bool]
    ranked: NotRequired[bool]
    game_speed: NotRequired[Literal["slow", "medium", "fast"]]


class _Vector2(TypedDict):
    x: float
    z: float


class SerializedGameState(TypedDict):
    """State of the particular pong game represented in the JSON format."""

    class _Bumper(_Vector2):
        """
        `score`: current score of the player.
        `buff_or_debuff_target`: whether the player is a target of a current buff or debuff.
        `move_id`: number of the last processed move.
        `timestamp`: timestamp sent by the client of when this move was applied.
        """

        score: int
        buff_or_debuff_target: bool
        move_id: int | Literal[-1]
        timestamp: int

    class _Ball(_Vector2):
        temporal_speed: _Vector2
        velocity: _Vector2

    class _Coin(_Vector2):
        pass

    bumper_1: _Bumper
    bumper_2: _Bumper
    ball: _Ball
    coin: _Coin | None
    is_someone_scored: bool
    current_buff_or_debuff: Literal[0, 1, 2, 3, 4, 5]
    current_buff_or_debuff_remaining_time: float
    elapsed_seconds: int
    time_limit_reached: bool


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
        close_code: CloseCodes

    class PlayerJoined(WorkerToClientOpen):
        """
        Player joined the game, and received number of their bumper as well as their unique id for the
        identification purposes.
        """

        action: Literal["player_joined"]
        player_id: str
        player_number: Literal[1, 2]
        is_paused: bool
        settings: GameRoomSettings

    class GameCancelled(WorkerToClientClose):
        """Both of the players failed to connect to the game, so it was cancelled."""

        action: Literal["game_cancelled"]
        tournament_id: str | None

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
        """
        One of the the player has won. Contains profile data of winner and loser, as well as the change in elo.
        `player_won` means that one of the players won normally.
        `player_resigned` means that one of the players won due to the other not managing to connect in time.
        """

        class _Player(TypedDict):
            name: str
            avatar: str
            elo: int
            score: int
            player_number: Literal[1, 2]

        action: Literal["player_won", "player_resigned"]
        winner: _Player
        loser: _Player
        elo_change: int
        tournament_id: str | None


class ClientToGameServer:
    """
    move_id: the ID of the move. Can have -1, which means that the move won't be processed.
    """

    class MoveLeft(TypedDict):
        """Player moves to the left."""

        action: Literal["move_left"]
        timestamp: int
        move_id: int | Literal[-1]
        player_id: str

    class MoveRight(TypedDict):
        """Player moves to the right."""

        action: Literal["move_right"]
        timestamp: int
        move_id: int | Literal[-1]
        player_id: str

    PlayerInput = MoveLeft | MoveRight

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
        settings: GameRoomSettings
        is_in_tournament: bool
        bracket_id: None | str
        tournament_id: None | str

    class PlayerInputed(TypedDict):
        """Player has inputed the controls, websocket server sends it to the game worker."""

        type: Literal["player_inputed"]
        action: Literal["move_left", "move_right"]
        game_room_id: str
        timestamp: int
        move_id: int
        player_id: str

    class PlayerDisconnected(TypedDict):
        """Player is disconnected from the websocket server, and it sends the relevant IDs to the worker."""

        type: Literal["player_disconnected"]
        game_room_id: str
        player_id: str
