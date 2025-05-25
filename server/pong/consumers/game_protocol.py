from typing import Literal, TypedDict


class SerializedGameState(TypedDict):
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
        action: Literal["game_found"]
        game_room_id: str
        username: str
        nickname: str
        avatar: str
        elo: int


class MatchmakingFromClientEvents:
    class Cancel(TypedDict):
        action: Literal["cancel"]


class GameRoomToClientEvents:
    class PlayerJoined(TypedDict):
        action: Literal["player_joined"]
        player_id: str

    class GameCancelled(TypedDict):
        action: Literal["game_cancelled"]

    class GameStarted(TypedDict):
        action: Literal["game_started"]

    class StateUpdated(TypedDict):
        action: Literal["state_updated"]
        state: SerializedGameState

    class GamePaused(TypedDict):
        action: Literal["game_paused"]
        remaining_time: int
        name: str

    class GameUnpaused(TypedDict):
        action: Literal["game_unpaused"]

    class PlayerWon(TypedDict):
        """When the player has won. Contains profile data of winner and loser, as well as the change in elo."""

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


class GameRoomToGameWorkerEvents:
    class PlayerConnected(TypedDict):
        type: Literal["player_connected"]
        game_room_id: str
        player_id: str
        profile_id: str
        name: str
        avatar: str
        elo: int

    class PlayerDisconnected(TypedDict):
        type: Literal["player_disconnected"]
        game_room_id: str
        player_id: str

    class PlayerInputed(TypedDict):
        type: Literal["player_inputed"]
        action: Literal["move_left", "move_right"]
        game_room_id: str
        player_id: str
        content: bool
