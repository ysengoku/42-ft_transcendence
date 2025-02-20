# API Endpoints & Schema

## User management

### Endpoint: /api/users/

#### GET

##### Response

200 (OK)

```json
[
  {
    "username": "string",
    "avatar": "string",
    "elo": 0,
    "is_online": true
  }
]
```

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

201 (Created)

```json
{
  "username": "string",
  "avatar": "string",
  "elo": 1000
}
```

422 (Unprocessable Entity)

```json
[
  {
    "msg": "string", // Reason why registration failed
    "type": "string",
    "loc": ["string"]
  }
]
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
    // can be null
    "username": "string",
    "avatar": "string",
    "elo": 0,
    "wins": 0,
    "loses": 0,
    "winrate": 0
  },
  "best_enemy": {
    // can be null
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

404 (Not Found)

```json
{
  "msg": "string"
}
```

#### POST

##### Request body

```
# DataForm
password (string)
password_repeat (string)
username (string)
email (string)
old_password (string)
new_profile_picture (string($binary))
```

##### Response

200 (OK)

```json
{
  "username": "string",
  "avatar": "string",
  "elo": 0,
  "is_online": true
}
```

401 (Unauthorized)

```json
{
  "msg": "string"
}
```

404 (Not Found)

```json
{
  "msg": "string"
}
```

422 (Unprocessable Entity)

```json
[
  {
    "msg": "string",
    "type": "string",
    "loc": ["string"]
  }
]
```

### Endpoint: /api/users/{username}/friends

#### GET 
200 (OK)
```JSON
{
  "items": [
    {
      "username": "string",
      "avatar": "string",
      "elo": 0,
      "is_online": true
    }
  ],
  "count": 0
}
```

404 (Not found)
```json
{
  "msg": "string"
}
```

#### POST
```json
{
  "username": "string"
}
```

201 (created)
```json
{
  "username": "string",
  "avatar": "string",
  "elo": 0,
  "is_online": true
}
```

404 (Not found)
```json
{
  "msg": "string"
}
```

### Endpoint: /api/users/{username}/friends/{friend_to_remove}

#### DELETE
username
friend_to_remove 

204	(No Content)
404	(Not Found)

```json
{
  "msg": "string"
}
```

### Endpoint: /api/users/{username}/blocked_users

#### GET

200 (OK)
```json
{
  "items": [
    {
      "username": "string",
      "avatar": "string",
      "elo": 0,
      "is_online": true
    }
  ],
  "count": 0
}
```
404 (Not found)
```json
{
  "msg": "string"
}
```

#### POST
201 (Created)
```json
{
  "username": "string",
  "avatar": "string",
  "elo": 0,
  "is_online": true
}
```
404 (Not found)
```json
{
  "msg": "string"
}
```

### Endpoint: /api/users/{username}/blocked_users/{blocked_user_to_remove}

204	(No Content)
404	(Not Found)

```json
{
  "msg": "string"
}
```

### Endpoint: api/oauth/authorize/{platform}

#### GET

200 (OK)
```json
{
  "url": "string"
}
```

404 (Not Found)
```json
{
  "msg": "string"
}
```

### Endpoint: api/oauth/callback/{platform}

#### GET

200 (OK)
```json
{
  "username": "string",
  "avatar": "string",
  "elo": 0,
  "is_online": true
}
```

408 (Request Timeout)
```json
{
  "msg": "string"
}
```

422 (Unprocessable Entity)
```json
{
  "msg": "string"
}
```

