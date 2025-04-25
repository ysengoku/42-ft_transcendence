# Socket Manager

## Overview

The `socketManager` is a singleton WebSocket manager that that can handle multiple named WebSocket connections.
Each named socket is an instance of `WebSocketManager` which wraps a single `WebSocket`, handles automatic reconnects, parses incoming messages, and dispatches them to registered listeners.

## `WS_PATH` Enum

Defines the URL path for each feature’s WebSocket endpoint.

```js
const WS_PATH = {
  livechat: '/ws/events/',
  matchmaking: '/ws/matchmaking/',
};
```

## `WebSocketManager` Class

Encapsulates one WebSocket connection and its lifecycle.

```js
class WebSocketManager {
  constructor(name: string, path: string, listeners: Record<string, Function>);
  connect(): void;
  reconnect(): void;
  close(): void;
  handleAction(event: MessageEvent): void;
}
```

### Constructor

- name: Identifier for logging/debugging.
- path: Relative WS URL path (e.g. `/ws/events/`).
- listeners: Map of action → handler functions.

### Methods

- `connect()`: Opens the socket (if not open). Sets up onopen, onmessage, onerror, onclose (with auto-reconnect).
- `reconnect()`: Called internally on close; waits 1 s then attempts to open again.
- `close()`: Gracefully closes the socket (no-op if already closed).
- `handleAction(event)`: Parses event.data as JSON, validates action field, and calls the matching listener with data.

## `socketManager` Singleton

Provides a global manager for all named sockets.

```js
const socketManager = (() => {
  class SocketsManager {
    private sockets: Map<string, WebSocketManager>;

    addSocket(name: string, listeners: Record<string, Function>): void;
    openSocket(name: string): void;
    closeSocket(name: string): void;
    closeAllSockets(): void;
    sendMessage(name: string, message: object): void;
  }
  return new SocketsManager();
})();
```

### Method

- `addSocket(name, listeners)`: Register a new socket by name, with its listeners. Pulls path from WS_PATH.
- `openSocket(name)`: Opens the connection for the given socket.
- `closeSocket(name)`: Closes and tears down the given socket.
- `closeAllSockets()`: Closes every registered socket.
- `sendMessage(name, message)`: Serializes message to JSON and sends it via the named socket.

## Built‐in Socket Registrations

We can register as many sockets as we need.
Here is how to do it for the built-in modules:

```js
// Livechat: chat messages, notifications, online presence
socketManager.addSocket('livechat', {
  new_message: (data) => { /* dispatch newChatMessage, toast, badge */ },
  like_message:  (data) => { /* dispatch toggleLikeChatMessage */ },
  unlike_message:(data) => { /* dispatch toggleLikeChatMessage */ },
  game_invite:   (data) => { /* badge + toast “X challenges you” */ },
  new_tournament:(data) => { /* badge + toast “X called to tournament” */ },
  new_friend:    (data) => { /* badge + toast “X is now your friend” */ },
  user_online:   (data) => { /* dispatch onlineStatus(online=true) */ },
  user_offline:  (data) => { /* dispatch onlineStatus(online=false)*/ },
});

// Matchmaking: game‐found events
socketManager.addSocket('matchmaking', {
  game_found: (data) => {
    const evt = new CustomEvent('gameFound', { detail: data, bubbles: true });
    document.dispatchEvent(evt);
  }
});
```

## Error Handling
	
- Malformed JSON or missing action → logged and ignored.
- Unknown action → logged via devErrorLog.

## Message Protocol

All messages follow this format:

```json
{
  "action": "some_event_name",
  "data": { /* payload specific to the action */ }
}
```

### Live Chat module Protocol

Live Chat module handles:
- Chat between 2 users
- Notifications for new friend, invitation to a match and new tournament creation
- Realtime users' online status update on UI

#### Chat

##### action: `new_message`

From Server to Client

| Field             | Type     |
|:------------------|:---------|
| chat_id           | string   |
| id (message id)   | string   |
| content           | string   |
| date              | datetime |
| sender (username) | string   |
| is_read           | bool     |
| is_liked          | bool     |

From Client to Server

| Field    | Type   |
|:---------|:-------|
| chat_id  | string |
| content  | string |


##### action: `like_message` & action: `unlike_message`

From Server to Client & From Client to Server

| Field             | Type     |
|:------------------|:---------|
| chat_id           | string   |
| id (message id)   | string   |


##### action: `read_message`

From Client to Server

| Field             | Type     |
|:------------------|:---------|
| chat_id           | string   |
| id (message id)   | string   |

#### Notifications

##### action: `new_friend`

From Server to Client

| Field                | Type   |
|:---------------------|:-------|
| id (notification id) | string |
| username             | string |
| nickname             | string |

##### action: `game_invite`

From Server to Client

| Field                  | Type   |
|:-----------------------|:-------|
| id (notification id)   | string |
| game_id                | string |
| username               | string |
| nickname               | string |

##### action: `reply_game_invite`

From Client to Server

| Field  | Type |
|:-------|:-----|
| id     | string |
| accept | bool   |

##### action: `new_tounament`

From Server to Client

| Field                  | Type   |
|:-----------------------|:-------|
| id (notification id)   | string |
| tounament_id           | string |
| tournament_name        | string |
| nickname (organizer)   | string |

##### action: `read_notification`

From Client to Server

| Field                  | Type   |
|:-----------------------|:-------|
| id (notification id)   | string |


#### Online status

##### action: `user_online` & action: `user_offline`

From Server to Client

| Field    | Type   |
|:---------|:-------|
| username | string |
