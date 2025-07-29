# Tournament WebSocket actions Protocol

The Tournament WebSocket (`/ws/tournament/{id}`) handles real-time updates related to tournament lifecycle, user registrations, and round progress.
This socket is opened when a user subscribes to a tournament and remains active until the elimination or the tournament ends.

## Format
```json
{
  "action":"<action name>",
  "data":{
    "<data content>"
  }
}
```

## Registration Events

### 🔷 `new_registration`

Sent when a user registers for the tournament.

| Field     | Type       | Description        |
|-----------|------------|--------------------|
| `alias`   | `string`   | Alias of the user  |
| `avatar`  | `string`   | Avatar URL         |

*UI Behavior:*   
*Add the newly registered participant’s alias to the pending tournament lobby view.*

---

### 🔷 `registration_canceled`

Sent when a user unregisters from the tournament.

| Field   | Type     | Description       |
|---------|----------|-------------------|
| `alias` | `string` | Alias of the user |

*UI Behavior:*    
*Remove unregistered participant's alias from pending tournament lobby view*

---

### 🔷 `tournament_canceled`

Sent to participants when the tournament is canceled by its creator.

| Field             | Type         | Description                        |
|-------------------|--------------|------------------------------------|
| `tournament_id`   | `string`     | ID of the tournament               |
| `tournament_name` | `string`     | Name of the tournament             |

*UI Behavior:*   
*Show a message notifying participants that the tournament has been canceled.*

---

## Tournament Progress

### 🔷 `tournament_start`

Sent when the tournament begins.

| Field             | Type     | Description                   |
|-------------------|----------|-------------------------------|
| `tournament_id`   | `string` | Tournament ID                 |
| `tournament_name` | `string` | Tournament name               |
| `round`           | `ROUND`  | First round bracket data      |

*UI Behavior:*   
*Display tournament starting message, then the bracket of round 1. After 2 seconds, redirect to `multiplayer-game` page*

---

### 🔷 `round_start`

Sent when a new round starts (excluding round 1).

| Field             | Type     | Description                   |
|-------------------|----------|-------------------------------|
| `tournament_id`   | `string` | Tournament ID                 |
| `tournament_name` | `string` | Tournament name               |
| `round`           | `ROUND`  | Bracket data of this round    |

*UI Behavior:*   
*Display the bracket of the next round, then redirect to `multiplayer-game` page*

---

### 🔷 `match_result`

Sent when a match finishes and its result becomes available.

| Field           | Type      | Description                  |
|-----------------|-----------|------------------------------|
| `tournament_id` | `string`  | Tournament ID                |
| `round_number`  | `int`     | Round number                 |
| `bracket`       | `BRACKET` | The updated match bracket    |

*UI Behavior:*   
*Display the result of finished match to the participants who had already their own matches and are waiting for others on `tournament page`.*

---

### 🔷 `round_end`

Sent when all matches in a round are completed.

| Field           | Type     | Description                |
|-----------------|----------|----------------------------|
| `tournament_id` | `string` | Tournament ID              |

*UI Behavior:*   
*If the uer is not on `tournament page`, show pop-up alert message to invite to come back to the tournament.*

### Data Structures

#### `ROUND` data:
| Field            | Type                | Description                 |
|------------------|---------------------|-----------------------------|
| `number. `       | `int`               | Round number                |
| `brackets`       | `[BRACKET]`         | All brackets of the round   |

#### `BRACKET` data:

| Field            | Type                         | Description                              |
|------------------|------------------------------|------------------------------------------|
| `match_id`       | `string`                     | ID of the game room for this bracket     |
| `participant1`   | `{ profile, alias }`         | Player 1 information                     |
| `participant2`   | `{ profile, alias }`         | Player 2 information                     |
| `winner`         | `{ profile, alias } \| null` | Match winner or null if ongoing          |
| `score_p1`       | `int`                        | Player 1 score                           |
| `score_p2`       | `int`                        | Player 2 score                           |

## Match Completion

The client receives `user_won` or `player_resigned` actions from `pong WebSocket`.

| Field            | Type               | Description                              |
|------------------|--------------------|------------------------------------------|
| `winner`         | `PLAYER`           | Winner of the match                      |
| `loser`          | `PLAYER`           | Loser of the match                       |
| `tournament_id`  | `string` \| `null` | ID of the tournament for the match       |


`PLAYER` data
 | Field    | Type     | Description                              |
|----------|----------|-------------------------------------------|
| `name`   | `string` | Nickname or username of the player        |
| `avatar` | `string` | Avatar URL of the player                  |
| `number` | `int`    | 1 if the user was player 1, 2 if player 2 |

*UI Behavior:*   
*Display the result of the match, then redirect to the `tournament page`.* 
