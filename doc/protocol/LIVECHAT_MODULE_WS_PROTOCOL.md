# LiveChat Module WebSocket Actions Protocol

Live Chat module handles:
- Chat between two users;
- Notifications for new friends, match invitations, and tournament creation;
- Real-time updates of users' online status in the UI.

## Format
```json
{
  "action":"<action name>",
  "data":{
    "<data content>"
  }
}
```

## Chat

#### CLIENT --> SERVER

##### 🔶 `new_message`

Send a new message to a chat room

| Field       | Type     | Description                           |
|:------------|:---------|:------------------------------------- |
| `chat_id`   | `string` | id of the chat room                   |
| `content`   | `string` | message content                       |
| `timestamp` | `string` | Timestamp indicating when it was sent |

##### 🔶 `like_message`

Like a message

| Field     | Type      | Description             |
|:----------|:----------|:------------------------|
| `chat_id` | `string`  | id of the chat room     |
| `id`      | `string`  | id of the liked message |

##### 🔶`unlike_message`

Remove a like from a message

| Field     | Type      | Description                |
|:----------|:----------|:---------------------------|
| `chat_id` | `string`  | id of the chat room        |
| `id`      | `string`  | id of the un-liked message |

##### 🔶 `read_message`

Mark a message as read

| Field     | Type      | Description            |
|:----------|:----------|:-----------------------|
| `chat_id` | `string`  | id of the chat room    |
| `id`      | `string`  | id of the read message |

#### SERVER --> CLIENT

##### 🔷 `new_message`

Send a new message to the receiver and the sender

| Field      | Type       | Description                          |
|:-----------|:-----------|:------------------------------------ |
| `chat_id`  | `string`   | id of the chat room                  |
| `id`       | `string`   | id of the message                    |
| `content`  | `string`   | message content                      |
| `date`     | `datetime` | date and time the message was sent   |
| `sender`   | `string`   | username of the sender               |
| `timestamp` | `string`  | Timestamp indicating when it was sent |

##### 🔷 `like_message`: Sent when the receiver liked a message

| Field       | Type       | Description                              |
|:------------|:-----------|:---------------------------------------- |
| `chat_id`   | `string`   | id of the chat room                      |
| `id`        | `string`   | id of the message                        |
| `is_liked`  | `boolean`  | true if the message is liked, else false |

## Notification

### New friend

#### SERVER --> CLIENT

##### 🔷 `new_friend`: Sent when someone adds the user to his friend list

| Field       | Type       | Description                                            |
|:------------|:-----------|:------------------------------------------------------ |
| `username`  | `string`   | username of the user who added the receiver as friend  |
| `nickname`  | `string`   | nickname of the user who added the receiver as friend  |

### Game invitation

#### CLIENT --> SERVER

##### 🔶 `game_invite`

Invite a user to duel

| Field       | Type     | Description                                                                       |
|:------------|:---------|:--------------------------------------------------------------------------------- |
| `username`  | `string` | username of the invitee                                                           |
| `options`   | `json`   | game options selected by the inviter                                              |
| `client_id` | `string` | id of the websocket instance of the browser tab from which the invitation is sent |


##### 🔶 `cancel_game_invite`

Cancel the game invitation sent by the user

| Field       | Type     | Description             |
|:------------|:---------|:------------------------|
| `username`  | `string` | username of the invitee |

##### 🔶 `reply_game_invite`

Reply to a game invitation (accept or decline)

| Field       | Type      | Description.                        |
|:------------|:----------|:------------------------------------|
| `username`  | `string`  | username of the inviter             |
| `accept`    | `boolean` | true if accepted, false if declined |

#### SERVER --> CLIENT

##### 🔷 `game_invite`

Sent when someone invites the user to duel

| Field      | Type       | Description               |
|:-----------|:-----------|:--------------------------|
| `username` | `string`   | username of the inviter   |
| `nickname` | `string`   | nickname of the inviter   |
| `avatar`   | `string`   | avatar url of the inviter |


##### 🔷 `game_invite_canceled`

Sent to the inviter when the server cancels the invitation 
Or to both the inviter and invitee when the inviter cancels the invitation.

| Field       | Type               | Description               |
|:------------|:-------------------|:--------------------------|
| `username`  | `string` \| `null` | username of the inviter   |
| `nickname`  | `string` \| `null` | nickname of the inviter   |
| `message`   | `string` \| `null` | reason why the server cancels the invitation |
| `client_id` | `string`           | id of the websocket instance of the browser tab from which the invitation is sent |

##### 🔷 `game_accepted`

Sent to the inviter and the invitee when the invitee accepted the invitation

| Field      | Type       | Description.                      |
|:-----------|:-----------|:----------------------------------|
| `game_id`  | `string`   | id of the game room for this duel |
| `username` | `string`   | username of the invitee           |
| `nickname` | `string`   | nickname of the invitee           |
| `avatar`   | `string`   | avatar url of the invitee         |

##### 🔷 `game_declined`

Sent to the inviter when the invitee declined the invitation

| Field      | Type       | Description.                      |
|:-----------|:-----------|:----------------------------------|
| `username` | `string`   | username of the invitee           |
| `nickname` | `string`   | nickname of the invitee           |

##### Game options

```json
{
  "score_to_win":	int,
  "game_speed": string,
  "ranked": boolean,
  "time_limit": int,
  "cool_mode": boolean,
}
```

### Tournament

#### SERVER --> CLIENT

##### 🔷 `new_tournament`: 

| Field             | Type       | Description                            |
|:------------------|:-----------|:---------------------------------------|
| `tournament_id`   | `string`   | id of the new tournament               |
| `tournament_name` | `string`   | name of the new tournament             |
| `creator`         | `string`   | alias of the creator of the tournament |

### Notification list

#### CLIENT --> SERVER

##### 🔶 `read_notification`

Sent to the server when th user made an action on the notification (click on button)

- `id`: id of the notification
| Field  | Type     | Description            |
|:-------|:---------|:-----------------------|
| `id`   | `string` | id of the notification |

## Online status

#### SERVER --> CLIENT

##### 🔷 `user_online`

Sent to all connected users when online status of someone changed from offline to online

| Field      | Type     | Description                                      |
|:-----------|:---------|:-------------------------------------------------|
| `username` | `string` | username of the user whose status becomes online |

##### 🔷`user_offline`

Sent to all connected users when online status of someone changed from online to offline

| Field      | Type     | Description                                       |
|:-----------|:---------|:--------------------------------------------------|
| `username` | `string` | username of the user whose status becomes offline |
