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
	"date_joined": "2025-01-18T12:47:27.588Z",
	"winrate": 0,
 	"worst_enemy": {
		"username": "string",
		"avatar": "string",
		"elo": 1000
	},
	 "best_enemy": {
		"username": "string",
		"avatar": "string",
		"elo": 1000
	},
	"scored_balls": 0,
	"elo_history": [
		{
			"date": "2025-01-18T12:47:27.588Z",
			"elo_change_signed": 0,
			"elo_result": 0
		}
	],
	"is_online": true,
	"elo": 1000,
	"friends": [
		0
	]
}
```