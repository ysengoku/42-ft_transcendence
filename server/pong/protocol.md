# THE PONG GAME PROTOCOL
## Matchmaking
### CLIENT -> SERVER
`connect`
  -> If unautorized, server closes connection with the special code 3002.

`cancel`: cancels the search and closes the connection with the matchmaking consumer.
  No additional data.
  -> server closes connection with the special code 3001.

ON ANY OTHER JSON:
  -> Server closes connection with the special code 3100.

### SERVER -> CLIENT
`game_found`: when the game was found successefully and the pong game can start.
  - `game_room_id`: id of the game room. Used for redirection to the pong match.
  - `username`: username of the opponent.
  - `nickname`: nickname of the opponent.
  - `avatar`: avatar of the opponent.
  - `elo`: elo of the opponent.
  -> Server closes connection with the special code 3000.

## Game room
### CLIENT -> SERVER
`connect`
  -> If unautorized, server closes connection with the special code 3002.

`move_left`: player stops or starts moving to the left.
  - `content`: bool.
  - `player_id`: id of the player.

`move_right`: player stops or starts moving to the right.
  - `content`: bool.
  - `player_id`: id of the player.

ON ANY OTHER JSON:
  -> Server closes connection with the special code 3100.

### SERVER -> CLIENT
`player_joined`: sent when the player is connected to the pong game, with unique `player_id` for identification purposes.
  - `player_id`: unique identifier of the connected player.

`game_cancelled` Both players failed to connect to the game.
  No additional data.
  -> Server closes the connection with the special code 3001.
  UI: Dark transparent overlay with wooden modal and the friendly message notifying the remaining player that the game was cancelled. Under the message, there are two buttons: one starts matchmaking again, and another redirects home.

`game_started`: Sent when both players are connected and the games is finally started.
  No additional data.
  UI: Before this event is fired: dark transparent overlay with wooden modal and message saying that one must wait for both of the players to join. After this event is fired: the elements of the UI are removed.

`state_updated` State update from the running pong match. Used to update the canvas with the new data.
  - `state`: the state of the match.
    - `bumper_1`: the position of the second bumper on the `x` and `z` axes, as well the `score` of this bumper.
      - `x`
      - `y`
      - `score`
    - `bumper_2`: the position of the second bumper on the `x` and `z` axes, as well the `score` of this bumper.
      - `x`
      - `y`
      - `score`
    - `ball`: the position of the ball on the `x` and `z` axes.
      - `x`
      - `z`
    - `is_someone_scored`: boolean. True if someone scored on the last tick, false otherwise.
  UI: no desired UI.

`game_paused`: one of the players is disconnected and the reconnection timer has started.
  - `remaining_time`: an integer, how much time is left for the other player to reconnect.
  - `name`: nickname or username of a disconnected player.
  UI: Dark transparent overlay. `Game paused` (with cowboy font), `Player {name} disconnected` and `Game will end in {remaining_time}` with `remaining_time` counting down (but not lower than 0). Messages are on the modal with wooden background.

`game_unpaused`: game is unpaused (player reconnected).
  No additional data.
  UI: UI elements from `game_paused` are removed.

`player_won`: one of the players won the game.
  - `winner`: data of the winner profile.
    - `name`: nickname or username of the winner.
    - `avatar`: avatar of the winner.
    - `elo`: new elo of the winner.
    - `number`: 1 if the player was player 1 during the game, 2 if the player was player 2.
  - `loser`: data of the loser profile.
    - `name`: nickname or username of the loser.
    - `avatar`: avatar of the loser.
    - `elo`: new elo of the loser.
    - `number`: 1 if the player was player 1 during the game, 2 if the player was player 2.
  - `elo_change`: change in elo between players.
  -> Server closes the connection with the special code 3000.
  UI: wooden modal with player with `number` 1 on the left, player with the `number` 2 on the right. On their respective sides there are `avatar`, their `name` under it, `elo` with red arrow down or green arrow up, with `elo_change` negative or positive, both depending on if they are loser or winner respectively.

`player_resigned`: one of the players won the game, because the other resigned (due to disconnection, for example).
  Data is the same as for `player_won`.
  -> Server closes the connection with the special code 3000.
  UI: same thing as for `player_won`.
