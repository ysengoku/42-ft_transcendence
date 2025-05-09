# Socket Manager

## Overview
The `socketManager` is a singleton WebSocket manager that facilitates real-time communication between the server and client. It maintains a persistent connection and handles different WebSocket events.

## Features
- Establishes and maintains a WebSocket connection.
- Automatically reconnects on disconnection.
- Dispatches custom events for specific actions.
- Displays toast notifications for new messages and notifications.
- Provides a listener system for handling WebSocket messages.

## Initialization
The `socketManager` is implemented as an Immediately Invoked Function Expression (IIFE), ensuring a single instance throughout the application.

## Connection Management
### `connect()`
Open a WebSocket connection if one is not already active. It is called on login or sign-up.

### `reconnect()`
Attempts to reconnect when the WebSocket connection is lost.

### `close()`
Closes the WebSocket connection.

## Event Handling
### `handleAction(event)`
Parses incoming messages and routes them to the appropriate listener based on the `action` field.

## Listeners
Each WebSocket event is mapped to a corresponding listener function:

### `new_message(data)`
- Dispatches a `newChatMessage` event in the chat interface.
- If the user is not on the chat page, updates the chat button badge and shows a toast notification.

### `like_message(data)` & `unlike_message(data)`
- Dispatches a `toggleLikeChatMessage` event to update message reactions in real-time.

### `game_invite(data)`
- Displays a toast notification for a new game invite and highlights the notifications button.

### `new_tournament(data)`
- Notifies the user about a new tournament with a toast message.

### `new_friend(data)`
- Shows a toast notification when a user adds the current user as a friend.

### `user_online(data)` & `user_offline(data)`
- Currently placeholders for handling online/offline user presence updates.

### `noMatchedListener(action)`
- Logs an error when an unhandled action is received.

## Error Handling
- Logs errors for WebSocket failures and malformed messages.
- Attempts to reconnect on connection failures.

## Extensibility
New event listeners can be added by extending the `listeners` object inside `WebSocketManager`.

## Example Usage
```javascript
import { socketManager } from '@socket';

// Establish connection
socketManager.connect();

// Close connection when needed
socketManager.close();

// Send message
socketManager.socket.send(JSON.stringify(messageData));
```

### Message format protocol
Received messages and messages to send  are structured as following example:
```json
{
	"action": "new_message",
	"data": {
      "chat_id": "awank87262n-nk4362",
	  "content": "Hello!"
	}
}
```
