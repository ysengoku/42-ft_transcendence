# API Endpoints & Schema

## User management

### /api/users

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
  "avatar": "string",
  "username": "string",
  "date_joined": "2025-01-17T20:00:56.092Z",
  "email": "string",
  "password": "string"
}
```

#### GET

200 (OK)
```json
{
	"avatar": "string",
    "username": "string",
    "date_joined": "2025-01-17T20:00:06.810Z",
    "email": "string",
    "password": "string"
}
```

### /api/users/{username}
