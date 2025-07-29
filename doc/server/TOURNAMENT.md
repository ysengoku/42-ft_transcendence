The `Tournament` module manages:

- Creation, organization, live progression and lifecycle of tournament.
- All real-time interactions via Django Channels and its WebSocket system.
- User flows: registration, matchmaking, match result reporting, notifications.
- REST and WebSocket APIs, validation, security, and concrete usage examples.

## 1. Architecture \& Data Flow

- **WebSockets**: Uses Django Channels.
  - Clients connect per tournament, identified via `tournament_{uuid}` group.
  - Private tournament events (defeat, kick...) use `tournament_user_{id}` group.
  - New tournaments announced site-wide by `tournament_global`.
- **Channel Groups**:
  - `tournament_{uuid}`: all tournament participants.
  - `tournament_user_{id}`: individual user events (connection, defeat, exclusion).
  - `tournament_global`: broadcast site-wide tournament creation.

> **Typical Flow**
>
> - User registers → WebSocket joins tournament groups → receives current state
> - Event (match result, round start...) triggers broadcast to correct group
> - Critical actions close WS with appropriate code (elimination, exclusion...)

## 2. User Flows \& Use Cases

**Core Journey:**

- Create tournament (4 or 8 players, name, creator alias, game settings)
- Registration by alias until full
- Auto-start: bracket generation and first round
- Knockout format: advance by winning
- Real-time notifications for each stage (next match, result, exclusion, finish)

## 3. Main Data Models

| Model       | Key Fields                                                                 | Description                    |
| :---------- | :------------------------------------------------------------------------- | :----------------------------- |
| Tournament  | id, name, status, required_participants, creator, winner, settings         | Tournament instance            |
| Participant | alias, profile, tournament, status, current_round, excluded                | Registered player and state    |
| Round       | number, status, tournament                                                 | One tournament round           |
| Bracket     | participant1, participant2, winner, status, winners_score, losers_score... | A match between 2 participants |

_Status values_: `pending`, `ongoing`, `finished`, `cancelled` (for Tournament/Bracket/Round).

## 4. REST API: Endpoints

| Endpoint                       | Method | Description                               | Params/Body            | Response               |
| :----------------------------- | :----- | :---------------------------------------- | :--------------------- | :--------------------- |
| `/tournaments/`                | POST   | Create a tournament                       | TournamentCreateSchema | 201 TournamentSchema   |
| `/tournaments/`                | GET    | List tournaments (optional status filter) | status                 | 200 [TournamentSchema] |
| `/tournaments/{id}`            | GET    | Retrieve specific tournament              | -                      | 200/404                |
| `/tournaments/{id}`            | DELETE | Cancel tournament (pending/creator only)  | -                      | 204/403/404            |
| `/tournaments/{id}/register`   | POST   | Register by alias                         | alias                  | 204/403/404            |
| `/tournaments/{id}/unregister` | DELETE | Unregister from tournament (if open)      | -                      | 204/403/404            |

## 5. WebSocket Protocol: Actions \& Events

| WS Action               | Required `data` fields                      | Target Group           | Description                                  |
| :---------------------- | :------------------------------------------ | :--------------------- | :------------------------------------------- |
| `tournament_start`      | `tournament_id`, `tournament_name`, `round` | `tournament_{uuid}`    | Begins tournament, provides first round data |
| `round_start`           | `tournament_id`, `tournament_name`, `round` | `tournament_{uuid}`    | Begins new round                             |
| `match_result`          | `tournament_id`, `round_number`, `bracket`  | `tournament_{uuid}`    | Updates after a match finishes               |
| `round_end`             | `tournament_id`                             | `tournament_{uuid}`    | Notifies end of round, all matches done      |
| `tournament_canceled`   | `tournament_id`, `tournament_name`          | `tournament_{uuid}`    | Tournament deleted/cancelled                 |
| `close_self_ws`         | —                                           | `tournament_user_{id}` | Explicitly closes WS (defeat, kick, etc.)    |
| `new_registration`      | `alias`, `avatar`                           | `tournament_{uuid}`    | User successfully registered                 |
| `registration_canceled` | `alias`                                     | `tournament_{uuid}`    | User unregistered                            |

- Invalid/unauthorized data: immediate WS closure with coded reason.
- State and user notifications are pushed after every significant event.

## 6. Validation, Security \& Integrity

- **REST/WS input validation**: required fields, types, valid status, alias uniqueness, users per tournament (4 or 8).
- **Registration constraints**: can't register if already participating or in a game.
- **Database protection**: atomic transactions during (un)registration, avoids duplicates/race conditions.
- **Security**: JWT required (header/WS), only legitimate users can perform actions.

## 7. Testing \& Resilience

- **Unit tests**: invalid registration/cancellation, bad tournament creation data, state transitions.
- **WebSocket tests**: connection flows, error handling, correct event delivery.
- **Robustness**: All anomaly cases handled (user/account deletion, abandonment, disconnects), tournaments auto-cancelled if needed.

## 8. Typical flow

1. User creates tournament (`POST /tournaments/`)
2. Other users register via `/register`
3. Once full, auto-start via `tournament_start` WS event
4. Each match completion: `match_result` event
5. When round is finished: `round_end` then `round_start` for next
6. After last match, winner notified, tournament marked `finished`.

## 9. Example Payloads

**Tournament start:**

```json
{
  "action": "tournament_start",
  "data": {
    "tournament_id": "4421b379-c0a3-4bb3-80b2-722d7593e290",
    "tournament_name": "Ultimate Pong",
    "round": {
      /* RoundSchema */
    }
  }
}
```

**Match result:**

```json
{
  "action": "match_result",
  "data": {
    "tournament_id": "4421b379-c0a3-4bb3-80b2-722d7593e290",
    "round_number": 2,
    "bracket": {
      /* BracketSchema */
    }
  }
}
```

**Tournament cancellation:**

```json
{
  "action": "tournament_canceled",
  "data": {
    "tournament_id": "4421b379-c0a3-4bb3-80b2-722d7593e290",
    "tournament_name": "Ultimate Pong"
  }
}
```

```mermaid
---
config:
  layout: dagre
  look: classic
  theme: base
  themeVariables:
    lineColor: '#f7230c'
    textColor: '#191919'
    fontSize: 25px
    nodeTextColor: '#000'
    edgeLabelBackground: '#fff'
---
flowchart TD
  %% Tournament Backend Worker internals
  subgraph TOURNAMENT_WORKER
    TW_PENDING["Wait for enough participants"]
    TW_START["START TOURNAMENT"]
    TW_CANCEL_TOURNAMENT["CANCEL TOURNAMENT"]
    TW_CANCEL_BRACKETS["cancel bracket"]
    TW_TAKE_WINNERS["Take winners from previous round / all participants"]
    TW_PREP_ROUND["PREPARE ROUND"]
    TW_PREP_BRACKETS["prepare brackets"]
    TW_GAME_ROOMS["create GameRooms for all brackets"]
    TW_MONITOR["LAUNCH ROUND AND MONITORS BRACKETS"]
    TW_ALL_BRACKETS_FINISHED["all brackets games finished"]
    TW_FALSE_WINNER["Set false winner to the cancelled bracket"]
    TW_START_GAME["START GAMES"]
    TW_END["SET WINNER AND ENDS TOURNAMENT"]
  end
  %% Game Backend Worker internals
  subgraph GAME_WORKER
    GW_END["handles the games"]
  end
  %% Tournament Worker logic flow
  TW_PENDING -- "The only participant registered leaves" --> TW_CANCEL_TOURNAMENT
  TW_PENDING -- "Creator cancels" --> TW_CANCEL_TOURNAMENT
  TW_PENDING -- "final participant registers" --> TW_START
  TW_PREP_ROUND -- "All brackets were cancelled" --> TW_CANCEL_TOURNAMENT
  TW_START --> TW_PREP_ROUND
  TW_PREP_ROUND --> TW_TAKE_WINNERS --> TW_PREP_BRACKETS
  TW_TAKE_WINNERS -- "Not an even number of participants" --> TW_CANCEL_TOURNAMENT
  TW_PREP_BRACKETS --> TW_GAME_ROOMS
  TW_GAME_ROOMS --> TW_MONITOR
  GW_END -- sends tournament_game_finished with results --> TW_MONITOR
  TW_MONITOR --> TW_START_GAME --> GW_END
  TW_MONITOR --> TW_ALL_BRACKETS_FINISHED
  TW_ALL_BRACKETS_FINISHED -- "only one winner left" --> TW_END
  TW_MONITOR -- "A bracket had no connection to the game within 10 seconds" --> TW_CANCEL_BRACKETS
  TW_CANCEL_BRACKETS -- "No player connected to any game" --> TW_CANCEL_TOURNAMENT
  TW_CANCEL_BRACKETS -- "Players connected to other games" --> TW_FALSE_WINNER
  TW_FALSE_WINNER --> TW_MONITOR
  TW_ALL_BRACKETS_FINISHED -- "winners > 1" --> TW_PREP_ROUND
  

  %% Styling
  style TOURNAMENT_WORKER fill:#70a9cc,stroke:#333,stroke-width:2px
  style TW_PREP_ROUND fill:white,color:blue;
  style TW_CANCEL_TOURNAMENT fill:#ed333b,color:white;
  style TW_MONITOR fill:orange,color:blue;
  style TW_START_GAME fill:blue,color:white;
  style TW_END fill:green,color:white;

  linkStyle 0,1,3,7,16 color:red;
  style GAME_WORKER fill:#cc99ff,stroke:#333,stroke-width:2px
---
