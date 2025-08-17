# Chat and Live Events

The Chat App manages core communication features within the application, including messaging, notifications, game invitations, and real-time user presence.

## Table of contents

- [Key features](#key-features)
  - [Real-time Messaging](#real-time-messaging)
  - [Notifications](#notifications)
  - [Game Invitations](#game-invitation)
  - [Real-time User Presence system](#real-time-presence-system)
- [Events](#events)
- [Implementation details](#implementation-details)
  - [Backend](#backend)
    - [Core models](#core-models)
  - [Frontend](#frontend)
- [API & WebSocket Protocol Reference](#api--websocket-protocol-reference)
  - [API Endpoints](#api-endpoints)
  - [WebSocket](#websocket-protocol)
- [Testing](#testing)
- [Contributors](#contributors)

<br />

## Key Features
🛠️👷🏻‍♂️
### Real-time Messaging

- Start or restart conversations using the embedded user search within the chat interface
- Send and receive messages instantly
- Toggle likes on messages
- Mark messages as read

### Notifications

- Notify users when someone adds them as a friend
- Notify users when new tournaments are created

### Game Invitations

- Send Duel invitations to other users
- Accept or decline incoming Duel invitations

### Real-time User Presence system

- Periodic background job (cron) to monitor user presence status
- Upon detecting status change, broadcast real-time notifications to all connected users

<br />

## Events

This section describes how the client and the server interact for each key feature. Detailed field-level specifications are provided in the [API & WebSocket Protocol Reference](#api--websocket-protocol-reference) section.

🛠️👷🏻‍♂️

### Messaging Events

#### ■ Start a conversation

A user can start a conversation in three ways:
- Click the **Send message** button on the target user's profile page
- Search for users in the Chat page and select the target
- Click an existing conversation preview in the left-side chat list of the Chat page

When a target user is selected, the client sends a request to `/chats/{username}` to either create or retrieve the chat room with the target:
- If the chat room already exists, the server responds with `200 OK` and returns the existing chat
- If no chat room exists, the server creates a new one and responds with `201 Created`
- If the target has blocked the user, the UI prevents discovering or selecting that user, so this case does not occur in the normal flow
- If the user has blocked the target, the client displays a **blocked state UI** and does not allow starting a conversation

<p align="center">
  <img src="../../assets/ui/chat-blocked-user.png" alt="Chat - Pending message" width="480px" />
</p>

On success, the client updates the chat list by moving the conversation to the top and renders the messages in the main chat area.

<p align="center">
  <img src="../../assets/ui/chat-selected-user.png" alt="Chat - Selected chat" width="480px" />
</p>
<p align="center">
  <img src="../../assets/ui/chat-new-conversation.png" alt="Chat - New conversation" width="480px" />
</p>

#### ■ Message sending

A user sends a message by typing into the input box in the main chat area.  
When the message is submitted, the client sends it to the server via the `new_message` WebSocket event. The message is immediately rendered in the main chat message area as a pending message for instant feedback.  

<p align="center">
  <img src="../../assets/ui/chat-pending-message.png" alt="Chat - Pending message" width="480px" />
</p>

On the server side, the message is validated and stored, then broadcast the `new_message` event to both chat participants:  
- If the user is on the Chat page, the left-side chat list is updated with the latest message, and the message appears instantly in the main chat area if the chat is being viewed.  
- Otherwise, an unread badge appears on the Navbar chat icon and a notification toast is displayed.

When a message is displayed in the UI, the client sends a `read_message` event to the server, which updates the message's read status in the database.

#### ■ Add or remove a like on a message

A user can toggle a like on any received message by clicking its container in the main chat message area.   
When a message is clicked, the client identifies the target message by its id attribute, then sends `like_message` or `unlike_message` WebSocket event to the server.   
The server checks that the chat exists and that the message is not authored by the user (to prevent liking one's own message). If valid, the like status is updated and the `like_message` event is broadcast to both chat participants.   
If the chat is currently open on the client side, the message’s CSS class toggles between liked and unliked to show or hide the heart icon.

<p align="center">
  <img src="../../assets/ui/chat-like-message.png" alt="Chat - Like message" width="480px" />
</p>

### Notifications

#### ■ New friend

#### ■ New tournament

### Game invitation

#### ■ Send an invitation

#### ■ Reply to the invitation










■ **Invite a user to play Pong**

- Please refer [Game invitation section](#client-server-invite-game)


<br />


---

### Notifications

#### Server triggered events

- **`new_friend`**

  Sent when someone adds the user to his friend list

- **`new_tournament`**

  Sent when a new tournament is created


<br />

#### Client triggered events

<a id="client-server-read-notification"></a>
- **`read_notification`**

  Sent to the server when th user made an action on the notification (click on button)
 
  *Calls `UserEventsConsumer.read_notification` to mark the notification as read in the database.*

---

### Game invitation

#### Client triggered events

- **`game_invite`**
  Invite a user to duel

  *Calls `DuelEvent.send_game_invite` to send an invitation to the specified user.*

- **`reply_game_invite`**
  Reply to a game invitation (accept or decline)
  *Calls `DuelEvent.reply_game_invite` to process the acceptance or decline.*

- **`cancel_game_invite`**
  Cancel the game invitation sent by the user
  *Calls `DuelEvent.cancel_game_invite` to cancel the sent invitation.*

<br />

#### Server triggered events

- **`game_invite`**
  Sent when someone invites the user to duel

- **`game_accepted`**
  Sent to the inviter and the invitee when the invitee accepted the invitation

- **`game_declined`**
  Sent to the inviter when the invitee declined the invitation

<br />

- **`game_invite_canceled`**
  Sent to the inviter when the server cancels the invitation, or to both the inviter and invitee when the inviter cancels the invitation.

<br />

---

### Online status 

#### Server triggered events

- **`user_online`**
  Sent to all connected users when online status of someone changed from offline to online

- **`user_offline`**
  Sent to all connected users when online status of someone changed from online to offline

<br />

## Implementation details
🛠️👷🏻‍♂️
### Backend
Server of the project is able to handle WebSockets thanks to the Django Channels integration (TODO: link to the .md file that describes in high level the dependencies of the project). User events are governed by the `UserEventsConsumer`, which is responsible for handling and distributing different events for different groups. It uses JWT authentication, like [the rest of the consumers in the project](./USER_MANAGEMENT.md#jwt-authentication).

#### WebSocket connection
- Open WebSocket (one connection per browser tab) on login
- Authenticate token and accept/close connection
- Join channel groups: `user_{id}`, `chat_{uuid}` (for each chat), `online_users`

#### On incoming WebSocket action:

- Validate incoming action
- Process application logic and persist changes (DB + optional cache)
- Push resulting events to relevant channel groups
  - (Detailed validation and error handling are described in [**Validation & Security**](#validation--security))

#### Notification delivery

- User-scoped events → `user_{id}` group (private push)
- Chat events → `chat_{uuid}` group (room push)
- Presence broadcasts → `online_users` group (connected online users only)

#### Game invitations

- Deliver real-time game invitations between users and persist them as notifications for all recipients, including those who are offline.
- Validate sender is not the recipient, validate settings, and ensure neither party is already in a `pending or ongoing GameRoom`.
- Transactionally create a `GameInvitation` record with status `PENDING` and a `Notification` with action `game_invite`.
- Send the `game_invite` WebSocket event to the recipient’s `user_{id} group` (private push), and also persist a sender copy so the invite can be canceled or queried later.
   
- On `reply_game_invite`:
  - If **accept**
    - Re-validate;
    - Create a `GameRoom`;
    - Mark the invitation `ACCEPTED`;
    - Update notifications, and broadcast `game_accepted` to both users.
  - If **decline**
    - Mark the invitation `DECLINED`;
    - Update notifications, and broadcast `game_declined`.
   
- Support explicit `cancel_game_invite` by the sender to mark the invitation `CANCELLED` and notify the invitee.
- Optionally expire stale `PENDING` invitations via a background job and notify sender and recipient when that happens.

#### Real-time Presence system

- Increment / decrement per-connection counter (`nb_active_connexions`) on connect / disconnect
- Consider user offline when counter == 0; persist offline state to DB/Redis
- Periodic cron (e.g., every 30 min) to detect inactive sessions and force-offline stale connections
- Refresh `last_activity` on each meaningful API/WebSocket request

#### Core Models

The chat system revolves around three main models: `Chat`, `ChatMessage`, and `Notification`. These models manage conversations between users, message histories, and notification events.

- `Chat`: Represents a chat session. This model itself supports multiple participants, but in the current app implementation, only one-to-one chats are used. All messages exchanged in the chat are associated with it via the `ChatMessage` model. Key fields include `id` (UUID) and `participants` (ManyToMany to `Profile`).

- `ChatMessage`: Represents a single message sent within a chat. It tracks the sender, the content, and the read and like status. Key fields include `id` (UUID), `content` (max length 256), `date`, `sender` (ForeignKey to `Profile`), `chat` (ForeignKey to `Chat`), `is_read`, and `is_liked`.

- `Notification`: Manages an event notification sent to a user. Notifications can indicate game invitations, new tournaments announcement, or friend additions. Key fields include `id` (UUID), `receiver` (ForeignKey to `Profile`), `data` (JSON), `action` (enum: `GAME_INVITE`, `NEW_TOURNAMENT`, `NEW_FRIEND`), and `is_read` (boolean).
  Each notification stores arbitrary JSON data related to the event:
  - **GAME_INVITE**: Information about the game invitation, such as `game_id`, `status`, and `invitee` information.
  - **NEW_TOURNAMENT**: Details of the tournament, including `tournament_id`, `tournament_name`, and  current `status`.
  - **NEW_FRIEND**: Includes sender's profile information to identify the new friend.

- `GameInvitation`: Represents a game invitation from one user to another. It tracks sender, recipient, optional invitee for special cases, status, and game settings. Key fields include `id` (UUID), `sender` (ForeignKey to `Profile`), `invitee` (optional ForeignKey), `recipient` (ForeignKey to `Profile`), `status` (enum: `pending`, `accepted`, `declined`, `cancelled`), and `settings` (JSON).

Game options
```json
{
  "score_to_win":	int,
  "game_speed": string,
  "ranked": boolean,
  "time_limit": int,
  "cool_mode": boolean,
}
```

<br />

#### WebSockets (Django Channels)

Each user establishes a WebSocket connection (one per browser tab), enabling:
  - Joining groups: `user_{id}`, `chat_{uuid}`, `online_users`
  - Receiving real-time events including chat messages, likes/unlikes on messages, friend additions, game invitations, notifications for newly created tournaments.

##### Channel Groups:
  - `user_{id}`: Private actions (notifications, friend-related updates)
  - `chat_{uuid}`: One-to-one chat messages between the two participants
  - `online_users`: Presence updates broadcasts

<br />

#### Validation & Security

- **Strict schema validation** for all incoming WebSocket data (fields, types, valid UUIDs).
  - Invalid data immediately triggers WebSocket closure with code `3100 (BAD_DATA)`.
  - Reasons for rejection: missing fields, wrong types, invalid UUID, unknown action.
- **Business logic constraints:**
  - Cannot self-invite/self-chat or like own messages.
  - No multiple invites for users already engaged in a game.
- **Backend protections:**
  - JWT auth is mandatory.
  - Resource access checked at every API/WebSocket action.
  - Use `transaction.atomic()` and `select_for_update()` for invitation acceptance to ensure atomic state changes.
  - Only the original sender can cancel an invitation.
  - Rate limiting applied to invitation sending to prevent spam.
  - All game settings and `client_id` values strictly sanitized and validated.

<br />
🛠️👷🏻‍♂️
### Frontend
🛠️👷🏻‍♂️
#### Chat

##### Basic UI Components

- Main component
  - `Chat`:   
    Manages the overall chat functionality and coordinates communication between child components.

- Child components
  - `ChatUsersearch`:   
    Handles the user search input and displays search results.

  - `ChatList`:   
    Displays the list of chat conversations and manages selection and unread badges.

  - `ChatMessageArea`:   
    Manages the chat messages UI, including displaying messages, user info, and interaction buttons.   
    This chat message area is a scrollable container that displays chat messages in chronological order. On a new message, the view scrolls to the bottom. The messages are considered to be read when the user scrolls through them. New messages are loaded when needed.

  - `ChatMessageInput`:   
    Provides the message input form and handles sending messages.

  - `InviteGameModal`:   
    Displays the Pong game invitation modal, manages game options selection and sending invitations.

<br />

#### Notifications

##### Basic UI Components

- Main component
  - `NotificationButton`:  
    Displays the notifications bell icon with an unread badge and toggles the notifications dropdown.

  - `NotificationsList`:  
    Fetches and renders notifications, supports infinite scroll, and updates according to user actions.

- Child components (`NotificationListItem`)
  - New friend:  
    Renders "new friend" notifications and provides navigation to the friend's profile.

  - Game invitations:  
    Renders "game invitation" notifications with action buttons to accept or decline.

  - New tournament:  
    Renders "new tournament" notifications with a "Participate" button that navigate to the tournament registration.

- Notification Toast:  
  Displays toast pop-ups for new notifications.

##### User-triggered Events

■ **Click on the Notification Button in Navbar**

- Clicking the `Notification Button` opens the `Notifications Dropdown` containing `NotificationsList` component.
- The `NotificationsList` component fetches notifications data from the API endpoint `/notifications?is_read=all&limit=10&offset={offset}`.
- Notifications are rendered dynamically according their actions (`new_friend`, `game_invite`, `new_tournament`).
- An `IntersectionObserver` detects when the user scrolls near the end of the list, triggering an API call to fetch and render more data.

<p align="center">
  <img src="../../assets/ui/notification-list.png" alt="Notification list" width="240px" />
</p>

<br />

■ **Toggle between** *All notifications* **and** *Unread notifications*

- Clicking `All` or `Unread` button switches the notifications tabs.
- Updates the current tab state (`all` or `unread`) and notifications with corresponding query parameters:
  - **All**: `/notifications?is_read=all&limit=10&offset={offset}`
  - **Unread** `/notifications?is_read=unread&limit=10&offset={offset}`
- Clears the current list and renders notifications based on the selected tab.

<br />

■ **Mark all notifications as read**

- Clicking the Mark all as read button sends a POST request to the API endpoint `/notifications/mark_all_as_read` to mark all notifications as read.
- Upon success, the notification list is refreshed to reflect the updated read status.

<br />

■ **`new friend` notification element**

- Clicking the `See profile` button navigates the user to the friend's profile page (`/profile/{username}`).
- [`read_notification`](#client-server-read-notification) action is sent via `socketManager` to mark this notification as read.

  <img src="../../assets/ui/notification-new-friend.png" alt="New friend" width="240px" />

<br />

■ **`game invitation` notification element**

- [`read_notification`](#client-server-read-notification) action is sent via `socketManager` to mark this notification as read.
- Please refer to the [Game Invitations section](#game-invitations) for details.

  <img src="../../assets/ui/notification-game-invitation.png" alt="Game invitation" width="240px" />

<br />

■ **`new tournament` notification element**

- Clicking the `Participate` button navigates the user to the Tournament menu page (`/tournament-menu`).
- When the Tournament menu page loads, the registration form modal is shown.
- [`read_notification`](#client-server-read-notification) action is sent via `socketManager` to mark this notification as read.

  <img src="../../assets/ui/notification-new-tournament.png" alt="New tournament" width="240px" />


##### Server-triggered Events

<a id="new_friend"></a>
■ **`new_friend`**

- Show a notification toast, add an unread badge on the Notification button in Navbar.

<br />

<a id="game_invite"></a>
■ **`game_invite`**

- Show a notification toast, add an unread badge on the Notification button in Navbar.

<br />

<a id="new_tournament"></a>
■ **`new_tournament`**

- Show a notification toast, add an unread badge on the Notification button in Navbar.
- If the current page is `/tournament-menu`, re-renders the tournament-menu component.

<br />

#### Game invitations

##### Basic UI Components

- In `Chat`
  - `Invite to Play` button:  
    Opens a modal to send a game invitation to another user
  - `InviteGameModal`:  
    Allows selecting game options and sends the invitation

- `DuelMenu`:  
  Sends a game invitation using user search

- `Duel`:  
  Displays the current duel status (`INVITING`, `STARTING`, `CANCELED`, `DECLINED`, etc.), opponent information, and a countdown timer when status is `STARTING`

##### User-triggered Events

■ **Invite a user to play**

- Clicking the `Invite to play` button opens a modal to send a game invitation.
- The `InviteGameModal` component manages this modal, including displaying game options and handling user interaction.
  - The modal allows the inviter to select game options; if some or all options are opted out, the default game settings are applied automatically.
  - Clicking `Send invitation` sends a [`game_invite`](#protocol-game-invite) action via `socketManager`.
- After sending the invitation, the modal closes, and navigation to the **Duel page** (`/duel`) occurs with the invitation details in query parameters.

<p align="center">
  <img src="../../assets/ui/chat-game-invitation.png" alt="Send Game invitation" width="480px" />
</p>

<p align="center">
  <img src="../../assets/ui/chat-game-invitation-waiting.png" alt="Pending Game invitation" width="480px" />
</p>

- Users can invite others also from the Duel Menu page (`/duel-menu`) by using user search form.

<p align="center">
  <img src="../../assets/ui/duel-menu-game-invitation.png" alt="Send Game invitation" width="480px" />
</p>

<br />

■ **Accept invitation**

- Clicking the `Accept` button in a game invitation notification first checks if the user is already in a duel (`/duel` page, `DUEL_STATUS.STARTING`).  
  - If in another starting duel, shows an error toast and aborts.  
  - If in an inviting state, cancels the existing invitation.
- Waits for the server’s confirmation `game_accepted` event using a `Promise` after sending a [`reply_game_invite`](#protocol-reply-game-invite) action via `socketManager` with `accept = true`.
- On confirmation, redirects to **Duel page** (`/duel`) with the new game’s details.

<br />

■ **Decline invitation**

- Clicking `Decline` button in Game invitation notification sends a [`reply_game_invite`](#protocol-reply-game-invite) action via `socketManager` with `accept = false`.
- Updates the **Duel page** status to `INVITATION_DECLINED` and renders the relevant content.

<br />

■ **Cancel Game invitation**

- The inviter can cancel the invitaion. Clicking `Cancel invitaion` button in Duel page (`/duel`) sends [`cancel_game_invite`](#protocol-cancel-game-invite) action via `socketManager`.
- Updates the **Duel page** status to `INVITATION_CANCELED` and the renders the relevant content.

##### Server-triggered Events

<a id="game_accepted"></a>
■ **`game_accepted`**

- The `duelInvitationAccepted` custom event is dispatched by `socketManager` with the game information in its detail.

- For the inviter, if the current page is **Duel page**(`/duel`),
  - Cancels matchmaking if in progress.
  - Sets game information from the custom event detail.
  - Updates page state to `STARTING`.
  - Starts countdown and redirects to the Multiplayer Game page (`/multiplayer-game/{id}`) when timer ends.

- For the invitee,
  - `duelInvitationAccepted` event listener retrieves the game information from the event detail.
  - Navigate to **Duel page** with the information as query parameters.
  - Starts countdown and redirects to the Multiplayer Game page (`/multiplayer-game/{id}`) when timer ends.

<br />

<a id="game_declined"></a>
■ **`game_declined`**

- If the current page is **Duel page** (`/duel`) and the **Duel page** status is `INVITING`, updates the **Duel page** status to `INVITATION_DECLINED` and renders the relevant content.
- Shows a notification toast to inform the user.

<br />

<a id="game_invite_canceled"></a>
■ **`game_invite_canceled`**

- If the current page is **Duel page** (`/duel`) and the **Duel page** status is `INVITING`, updates the **Duel page** status to `INVITATION_CANCELED` and renders the relevant content.
- Shows a notification toast to inform the user.

<br />

#### Real-time presence system

##### Basic UI Components

- Online status indicator in:
  - `Profile` (realtime-update)
  - `UserSearch` in Navbar
  - `ChatListItem` (realtime-update)
  - `ChatMessageArea` (realtime-update)
  - `ChatUserSearch`
  - User search result in `DuelMenu` (realtime-update)

##### Client-triggered Events

- On each API request, if server responses include online status information (`is_online`), the client updates the corresponding UI elements to reflect the current status.

#### Server-triggered Events

<a id="user_online"></a>
■ **`user_online`**

- Upon receiving `user_online` event, `socketManager` dispatches an `onlineStatus` custom event  
  with `detail.online` set to `true`.
- Components that support real-time updates have listeners for this event and update UI accordingly.

<br/>

<a id="user_offline"></a>
■ **`user_offline`**

- Upon receiving `user_offline` event, `socketManager` dispatches an `onlineStatus` custom event  
  with `detail.online` set to `false`.
- Components that support real-time status updates have listeners for this event and update their UI accordingly.

## API & WebSocket Protocol Reference

### API Endpoints

#### Chat

| Endpoint                          | Method | Description                                     | Params            | Returns (Code)             |
| :-------------------------------- | :----- | :---------------------------------------------- | :---------------- | :------------------------- |
| `/chats/`                         | GET    | Paginated list of user's chats                  | `limit`, `offset` | 200, 401                   |
| `/chats/{username}`               | PUT    | Open or create a chat, returns last 30 messages | -                 | 200/201, 401, 404          |
| `/chats/{username}/messages`      | GET    | Retrieve chat messages (paginated)              | `limit`, `offset` | 200, 401, 404              |

#### Notifications

| Endpoint                          | Method | Description                                     | Params                       | Returns (Code)             |
| :-------------------------------- | :----- | :---------------------------------------------- | :--------------------------- | :------------------------- |
| `/notifications/`                 | GET    | Paginated notification list                     | `is_read`, `limit`, `offset` | 200, 401                   |
| `/notifications/mark_all_as_read` | POST   | Mark all notifications as read                  | -                            | 200, 401                   | 

---

### WebSocket Protocol

#### Endpoint
🛠️👷🏻‍♂️
The Live Chat WebSocket (`/ws/events`) manages real-time events within the application, including chat messages, message reactions, friend additions, game invitations, notifications, and user presence updates.
Connection is opened when a user logs in and remains active until the user logs out, closes the tab, or loses connection.

#### Message Format

```json
{
  "action":"<action name>",
  "data":{
    "<data content>"
  }
}
```

#### Chat

CLIENT --> SERVER

<a id="client-serverprotocol-new-message"></a>
- **new_message**
  | Data field  | Type     | Description                           |
  |:------------|:---------|:------------------------------------- |
  | `chat_id`   | `string` | id of the chat room                   |
  | `content`   | `string` | message content                       |
  | `timestamp` | `string` | Timestamp indicating when it was sent |

<a id="protocol-like-message"></a>
- **like_message**:
  | Data field | Type      | Description             |
  |:-----------|:----------|:------------------------|
  | `chat_id`  | `string`  | id of the chat room     |
  | `id`       | `string`  | id of the liked message |

<a id="protocol-unlike-message"></a>
- **unlike_message**

  | Data field | Type      | Description                |
  |:-----------|:----------|:---------------------------|
  | `chat_id`  | `string`  | id of the chat room        |
  | `id`       | `string`  | id of the un-liked message |

<a id="client-server-read-message"></a>
- **read_message**

  | Data field | Type      | Description            |
  |:-----------|:----------|:-----------------------|
  | `chat_id`  | `string`  | id of the chat room    |
  | `id`       | `string`  | id of the read message |

<br />

SERVER --> CLIENT

- **`new_message`**

  | Data field | Type       | Description                           |
  |:-----------|:-----------|:------------------------------------- |
  | `chat_id`  | `string`   | id of the chat room                   |
  | `id`       | `string`   | id of the message                     |
  | `content`  | `string`   | message content                       |
  | `date`     | `datetime` | date and time the message was sent    |
  | `sender`   | `string`   | username of the sender                |
  | `timestamp`| `string`   | Timestamp indicating when it was sent | 

<br />

- **`like_message`**

  | Data field  | Type       | Description                              |
  |:------------|:-----------|:---------------------------------------- |
  | `chat_id`   | `string`   | id of the chat room                      |
  | `id`        | `string`   | id of the message                        |
  | `is_liked`  | `boolean`  | true if the message is liked, else false |

---

#### Notifications

CLIENT --> SERVER

<a id="client-server-read-notification"></a>
- **`read_notification`**

  | Data field | Type     | Description            |
  |:-----------|:---------|:-----------------------|
  | `id`       | `string` | id of the notification |

<br />

SERVER --> CLIENT

- **`new_friend`**

  | Data field  | Type       | Description                                            |
  |:------------|:-----------|:------------------------------------------------------ |
  | `username`  | `string`   | username of the user who added the receiver as friend  |
  | `nickname`  | `string`   | nickname of the user who added the receiver as friend  |

<br />

- **`new_tournament`**

  | Data field        | Type       | Description                            |
  |:------------------|:-----------|:---------------------------------------|
  | `tournament_id`   | `string`   | id of the new tournament               |
  | `tournament_name` | `string`   | name of the new tournament             |
  | `creator`         | `string`   | alias of the creator of the tournament |

<br />

---

#### Game invitation

CLIENT --> SERVER

<a id="protocol-game-invite"></a>
- **`game_invite`**
  | Data field  | Type     | Description                                                                       |
  |:------------|:---------|:--------------------------------------------------------------------------------- |
  | `username`  | `string` | username of the invitee                                                           |
  | `options`   | `json`   | game options selected by the inviter                                              |
  | `client_id` | `string` | id of the websocket instance of the browser tab from which the invitation is sent |

  **Example of `options` JSON:**
  ```json
  {
    "score_to_win": 10,
    "game_speed": "slow",
    "ranked": true,
    "time_limit": 3,
    "cool_mode": false
  }
  ```
<br />

<a id="protocol-reply-game-invite"></a>
- **`reply_game_invite`**

  | Data field  | Type      | Description.                        |
  |:------------|:----------|:------------------------------------|
  | `username`  | `string`  | username of the inviter             |
  | `accept`    | `boolean` | true if accepted, false if declined |

<a id="protocol-cancel-game-invite"></a>
- **`cancel_game_invite`**

  | Data field  | Type     | Description             |
  |:------------|:---------|:------------------------|
  | `username`  | `string` | username of the invitee |

<br />

#### SERVER --> CLIENT

- **`game_invite`**

  | Data field | Type       | Description               |
  |:-----------|:-----------|:--------------------------|
  | `username` | `string`   | username of the inviter   |
  | `nickname` | `string`   | nickname of the inviter   |
  | `avatar`   | `string`   | avatar url of the inviter |

<br />

- **`game_accepted`**

  | Data field | Type       | Description.                      |
  |:-----------|:-----------|:----------------------------------|
  | `game_id`  | `string`   | id of the game room for this duel |
  | `username` | `string`   | username of the invitee           |
  | `nickname` | `string`   | nickname of the invitee           |
  | `avatar`   | `string`   | avatar url of the invitee         |

<br />

- **`game_declined`**

  | Data field | Type       | Description.                      |
  |:-----------|:-----------|:----------------------------------|
  | `username` | `string`   | username of the invitee           |
  | `nickname` | `string`   | nickname of the invitee           |

<br />

- **`game_invite_canceled`**

  | Data field  | Type               | Description                                  |
  |:------------|:-------------------|:---------------------------------------------|
  | `username`  | `string` \| `null` | username of the inviter                      |
  | `nickname`  | `string` \| `null` | nickname of the inviter                      |
  | `message`   | `string` \| `null` | reason why the server cancels the invitation |
  | `client_id` | `string`           | id of the websocket instance of the browser tab from which the invitation is sent |

<br />

## Testing
`make tests-chat` will initialize the tests related to the chat and live events system.

## Contributors

<table>
  <tr>
    <td align="center" style="padding: 8px; vertical-align: middle;">
      <a href="https://github.com/emuminov" style="text-decoration: none;">
        <img src="../../assets/profile/emuminov.png" width="48px" alt="emuminov" /><br />
        <p>emuminov</p>
      </a>
    </td>
    <td style="padding-left: 16px; vertical-align: middle;">
      Chat HTTP API, documentation
    </td>
  </tr>

  <tr>
    <td align="center" style="padding: 8px; vertical-align: middle;">
      <a href="https://github.com/melobern" style="text-decoration: none;">
        <img src="../../assets/profile/melobern.png" width="48px" alt="melobern" /><br />
        <p>melobern</p>
      </a>
    </td>
    <td style="padding-left: 16px; vertical-align: middle;">
      Chat HTTP API, WebSocket chat layer, and documentation
    </td>
  </tr>

  <tr>
    <td align="center" style="padding: 8px; vertical-align: middle;">
      <a href="https://github.com/ysengoku" style="text-decoration: none;">
        <img src="../../assets/profile/ysengoku.png" width="48px" alt="Yuko SENGOKU" /><br />
        <p>ysengoku</p>
      </a>
    </td>
    <td style="padding-left: 16px; vertical-align: middle;">
      Chat UI design, frontend development and documentation
    </td>
  </tr>
</table>
