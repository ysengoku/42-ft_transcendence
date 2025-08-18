# Socket Manager

## Overview

The `socketManager` is a singleton WebSocket manager that can handle multiple named WebSocket connections.
Each named socket is an instance of `WebSocketManager` which wraps a single `WebSocket`, handles automatic reconnects, parses incoming messages, and dispatches them to registered listeners.

## `WS_PATH` Enum

Defines the URL path for each feature’s WebSocket endpoint.

```js
const WS_PATH = {
  livechat: '/ws/events/',
  matchmaking: (options) => (options === null ? '/ws/matchmaking/' : `/ws/matchmaking/${options}`),
  tournament: (id) => `/ws/tournament/${id}`,
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

### Reconnection Logic
Automatic reconnection is built-in for resilience against unintentional disconnections:

- The `onclose` handler triggers `reconnect()` when:
  - the socket was not closed intentionally;
  - the close code is not ≥ 3000 (which usually means server-initiated shutdown);
  - the close code is not 1006 or 1011, which indicate more serious connection or server errors. In those cases, a user-facing toast notification is shown.

- Retry behavior:
  - Reconnect attempts are delayed by 1 second using setTimeout().
  - Reconnection uses the same path and listeners, reinitializing the socket.

- Stop conditions:
  - If the server repeatedly closes the connection with code ≥ 3000, the socket is assumed to be intentionally closed and no further reconnect attempts are made.
  - If the user has manually called close(), no reconnection is attempted.

## Built‐in Socket Registrations

We can register as many sockets as we need.
Here is how to do it for the built-in modules:

```js
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
```

## Error Handling
	
- Malformed JSON or missing action → logged and ignored.
- Unknown action → logged via log.error.

## Message Protocol

All messages follow this format:

```json
{
  "action": "some_event_name",
  "data": { /* payload specific to the action */ }
}
```

### 👉 `livechat`

The `livechat` WebSocket is used to receive and send real-time updates related to chat activity and global events. This socket is persistent and remains open while the user is authenticated and active in the application.

It includes:
- Sending and receiving chat messages;
- Handling like/dislike actions on chat messages;
- Receiving notifications when other users come online or go offline;
- Receiving game invitations from other users and replying to them;
- Receiving notifications when other users add the user to their friend list.

The communication protocol is explained here: [LiveChat Module WebSocket actions Protocol](./protocol/LIVECHAT_MODULE_WS_PROTOCOL.md)

### 👉 `matchmaking`

The `matchmaking` WebSocket manages real-time interactions during the matchmaking process.
- If `options` is null, the connection is established at /ws/matchmaking/. Game options will be set to default value by the server.
- If `options` is provided, it connects to /ws/matchmaking/<options>, where <options> represents the game options selected by the user.
The socket is opened when the user enters matchmaking and closed once the match is found.

This WebSocket handles:
- Searching for or waiting for a match based on selected game options;
- Receiving a notifications when a match is found;
- Sending a cancel action when the user cancels matchmaking.

### 👉 `tournament`

The `tournament` socket is opened when a user subscribes to a tournament and remains active to provide live synchronization of tournament-related data. It is closed when the user is eliminated, or when the tournament ends or is canceled.

This WebSocket handles:
- Receiving new registrations and cancellations, and updating the lobby UI;
- Managing tournament lifecycle events (start, cancel, round start/end);
- Updating match results in the bracket for users who have completed their matches and are waiting for the next round;
- Notifying users through UI updates or alerts, depending on context.

The communication protocol is explained here: [Tournament WebSocket actions Protocol](./protocol/TOURNAMENT_WS_PROTOCOL.md)
