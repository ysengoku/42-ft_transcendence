# THE TOURNAMENT GAME PROTOCOL

(Only changes with the game protocol are noted)

## SERVER -> CLIENT

### Tournament

`bracket_ready` instead of `game_found` when the bracket's pong game can start

- `alias`: alias of the opponent. Instead of `name`
- No `nickname` nor `elo` because we don't need/show them here

### Game room

`game_cancelled` Both players failed to connect to the game.
The GameRoom's status is put to CANCELLED
-> Server closes the connection with the special code 3001.

- `name`: alias and not nickname nor username of a disconnected player.

- `winner`: data of the winner profile.
  - `alias` and not `name`: alias of the winner. OR name = alias if Tournament GameRoom
  - NOT ON TOURNAMENT : `elo`: new elo of the winner.
- `loser`: data of the loser profile.
  - `alias` and not `name`: alias of the loser. OR name = alias if Tournament GameRoom
  - `avatar`: avatar of the loser.
  - NOT ON TOURNAMENT : `elo`: new elo of the loser.
- NOT ON TOURNAMENT : `elo_change`: change in elo between players.
  -> Server closes the connection with the special code 3000.
