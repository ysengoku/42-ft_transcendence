# API Endpoints & Schema

## User management

### Endpoint: /api/users/

#### POST

##### Request body
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "password_repeat": "string"
}
```

##### Response
201(Created)
```json
{
	"username": "string",
	"avatar": "string",
	"elo": 1000
}
```
---
### Endpoint: /api/users/{username}

#### GET
##### Response
200 (OK)
```json
{
  "username": "string",
  "avatar": "string",
  "elo": 0,
  "is_online": true,
  "date_joined": "2025-01-20T08:32:43.066Z",
  "wins": 0,
  "loses": 0,
  "winrate": 0,
  "worst_enemy": {
    "username": "string",
    "avatar": "string",
    "elo": 0,
    "wins": 0,
    "loses": 0,
    "winrate": 0
  },
  "best_enemy": {
    "username": "string",
    "avatar": "string",
    "elo": 0,
    "wins": 0,
    "loses": 0,
    "winrate": 0
  },
  "scored_balls": 0,
  "elo_history": [
    {
      "date": "2025-01-20T08:32:43.066Z",
      "elo_change_signed": 0,
      "elo_result": 0
    }
  ],
  "friends": [
    {
      "username": "string",
      "avatar": "string",
      "elo": 0,
      "is_online": true
    }
  ]
}
```