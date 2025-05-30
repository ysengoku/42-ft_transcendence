# LIVECHAT MODULE PROTOCOL

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

`new_message`: Send a new message in a chat room
- `chat_id`(string): id of the chat room
- `content`(string): message content

`like_message`: Like a message
- `chat_id`(string): id of the chat room
- `id`(string): id of the liked message

`unlike_message`: Unlike a message
- `chat_id`(string): id of the chat room
- `id`(string): id of the unliked message

`read_message`: Mark a message as read
- `chat_id`(string): id of the chat room
- `id`(string): id of the liked message

#### SERVER --> CLIENT

`new_message`: Send a new message to the receiver and the sender
- `chat_id`(string): id of the chat room
- `id`(string): id of the message
- `content`(string): message content
- `date`(datetime): date and time of messege sending
- `sender`(string): username of the sender

`like_message`: Sent when the receiver liked a message
- `chat_id`(string): id of the chat room
- `id`(string): id of the liked message

`unlike_message`:Sent when the receiver unliked a message
- `chat_id`(string): id of the chat room
- `id`(string): id of the unliked message

## Notification

### New friend

#### SERVER --> CLIENT

`new_friend`: Sent when someone adds the user to his friend list
- `username`(string): username of the user who added him as friend
- `nickname`(string): nickname of the user who added him as friend 

### Game invitation

#### CLIENT --> SERVER

`game_invite`: Invite a user to duel
- `username`(string): username of the invitee
- `options`(json): game options selected by the inviter
- `client_id`(string): id of the websocket instance of the browser tab from which the invitation is sent

`cancel_game_invite`: Cancel the game invitation sent by himself
- `username`(string): username of the invitee

`reply_game_invite`: Reply to a game invitation (accept or decline)
- `username`(string): username of the inviter
- `accept`(bool): true if accepted, false if declined

#### SERVER --> CLIENT

`game_invite`: Sent when someone invite the user to duel
- `username`(string): username of the inviter 
- `nickname`(string): nickname of the inviter
- `avatar`(string): avatart url of the inviter

`game_invite_canceled`:
Sent to the inviter when the server cancels the invitation 
OR to th inviter and invitee when the inviter has canceled his invitation.
- `client_id`(string): id of the websocket instance of the browser tab from which the invitation is sent
- `username`(string | null): username of the inviter
- `nickname`(string | null): nickname of the inviter
- `message`(string | null): reason why the server cancels the invitation

`game_accepted`: Sent to the inviter and the invitee when the invitee accepted the invitation
- `game_id`(string): id of the game room for this duel
- `username`(string): username of the invitee 
- `nickname`(string): nickname of the invitee
- `avatar`(string): avatart url of the invitee

`game_decliend`: Sent to the inviter when the invitee declined the invitation
- `username`(string): username of the invitee 
- `nickname`(string): nickname of the invitee

Game options
```json
{
  "score_to_win":	int,
  "game_speed": string (),
  "is_ranked": bool,
  "time_limit_minutes" int,
}
```

### Tournament

#### SERVER --> CLIENT

`new_tournament`: 
- `tournament_id`(string): id of the new tournament
- `tournament_name`(string): name of the new tournament
- `creator`(string): alias of the creator of the tournament

`tournament_finished`
- `tournament_id`(string): id of the new tournament
- `tournament_name`(string): name of the new tournament
- `winner`(string): alias of the champion of the tournament

### Notification list

#### CLIENT --> SERVER

`read_notification`: Sent to the server when th user made an action on the notification (click on button)
- `id`: id of the notification

## Online status

#### SERVER --> CLIENT

`user_online`: Sent to all connected users when online status of someone changed from offline to online
- `username`(string): username of the user online

`user_offline`: Sent to all connected users when online status of someone changed from online to offline
- `username`(string): username of the user offline
