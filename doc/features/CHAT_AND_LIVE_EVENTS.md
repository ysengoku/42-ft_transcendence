# Chat and Live Events

The Chat and Live Events system manages core communication features within the application, including messaging, notifications, game invitations, and real-time user presence.

## Table of contents

- [Features](#key-features)
  - [Real-time Messaging](#real-time-messaging)
  - [Notifications](#notifications)
  - [Game Invitations](#game-invitation)
  - [User Presence system](#user-presence-system)
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

## Features

This section describes how the client and the server interact for each key feature. Detailed field-level specifications are provided in the [API & WebSocket Protocol Reference](#api--websocket-protocol-reference) section.

### Real-time Messaging

#### ■ Start a conversation

A user can start a conversation in three ways:
- Click the **Send message** button on the target user's profile page
- Search for users in the Chat page and select the target
- Click an existing conversation preview in the left-side chat list of the Chat page

When a target user is selected, the client sends a `PUT /api/chats/{username}` request to either create or retrieve the chat room with the target:
- If the chat room already exists, the server responds with `200 OK` and returns the existing chat
- If no chat room exists, the server creates a new one and responds with `201 Created`
- If the target has blocked the user, the UI prevents discovering or selecting that user, so this case does not occur in the normal flow
- If the user has blocked the target, the client displays a **blocked state UI** and does not allow starting a conversation


On success, the client updates the chat list by moving the conversation to the top and renders the messages in the chat messages area.

<figure align="center">
  <figcaption>Select an existing chat</figcaption>
  <img src="../../assets/ui/chat-selected-user.png" alt="Chat - Selected chat" width="480px" />
</figure>
<figure align="center">
  <figcaption>Start a new chat</figcaption>
  <img src="../../assets/ui/chat-new-conversation.png" alt="Chat - New conversation" width="480px" />
</figure>
<figure align="center">
  <figcaption>Chat with a user blocked by the logged-in user</figcaption>
  <img src="../../assets/ui/chat-blocked-user.png" alt="Chat - Blocked user" width="480px" />
</figure>

#### ■ Message sending

A user sends a message by typing into the input box in the main chat area.  
When the message is submitted, the client sends it to the server via the [`new_message`](#protocol-new-message-client-server) WebSocket event. The message is immediately rendered in the main chat message area as a pending message for instant feedback.  

<p align="center">
  <img src="../../assets/ui/chat-pending-message.png" alt="Chat - Pending message" width="480px" />
</p>

On the server side, the message is validated and stored, then broadcast the [`new_message`](#protocol-new-message-server-client) event to both chat participants:  
- If the user is on the Chat page, the left-side chat list is updated with the latest message, and the message appears instantly in the main chat area if the chat is being viewed.  
- Otherwise, an unread badge appears on the Navbar chat icon and a notification toast is displayed.

<p align="center">
  <img src="../../assets/ui/chat-sent-message.png" alt="Chat - Sent message" width="480px" />
</p>

When a message is displayed in the UI, the client sends a [`read_message`](#protocol-read-message) event to the server, which updates the message's read status in the database.

#### ■ Add or remove a like on a message

A user can toggle a like on any received message by clicking its container in the main chat message area.   
When a message is clicked, the client identifies the target message by its id attribute, then sends [`like_message`](#protocol-like-message-client-server) or [`unlike_message`](#protocol-unlike-message-client-server) WebSocket event to the server.   
The server checks that the chat exists and that the message is not authored by the user (to prevent liking one's own message). If valid, the like status is updated and the [`like_message`](#protocol-like-message-server-client) event is broadcast to both chat participants.   
If the chat is currently open on the client side, the message’s CSS class toggles between liked and unliked to show or hide the heart icon.

<p align="center">
  <img src="../../assets/ui/chat-like-message.png" alt="Chat - Like message" width="480px" />
</p>

<br />

### Notifications

The server can push the following notification events to the clients 
- [`new_friend`](#protocol-new-friend): Another user has added the user to the friend list  (See [User Management docs](./USER_MANAGEMENT.md#social-networking-elements) for friend list).
- [`new_tournament`](#protocol-new-tournament): A new tournament has been created by another user.
- [`game_invite`](#protocol-game-invite-server-client): The user is invited to Pong Duel by another user (See [Game invitation section](#game-invitation))

All notification data are stored in the database.   

When a notification arrives, the client displays a toast and adds an unread badge to the **Notifications** button in the Navbar.
Clicking the button triggers `GET /api/notifications?is_read=all&limit=10&offset={offset}` and opens dropdown menu with notification list.

<p align="center">
  <img src="../../assets/ui/notification-list.png" alt="Notification list" width="240px" />
</p>

Selecting a notification item in the list, 
- The client sends `read_notification` event to the server, marking it as read in the database.

- **New friend**: Navigate to the new friend's profile page.   
  <img src="../../assets/ui/notification-new-friend.png" alt="New friend" width="240px" />

- **New tournament**: Navigate to the tournament page and open the registration form.   
  <img src="../../assets/ui/notification-new-tournament.png" alt="New tournament" width="240px" />

User can also mark all unread notification as read by clicking **Mark all as read** button, which triggers a `POST /api/notifications/mark_all_as_read` request.


<br />

### Game invitation

A user can invite others to Pong Duel from either **Chat page** or another user's **Profile page**.

<figure align="center">
  <figcaption>Send invitation from Chat page</figcaption>
  <img src="../../assets/ui/chat-game-invitation.png" alt="Send Game invitation" width="480px" />
</figure>
<figure align="center">
  <figcaption>Send invitation from Duel Menu page</figcaption>
  <img src="../../assets/ui/duel-menu-game-invitation.png" alt="Send Game invitation" width="480px" />
</figure>

When a user sends an invitation, [`game_invite`](#protocol-game-invite-client-server) event is sent to the server.
If the inviter is not engaged in any other game activity (no ongoing/pending game, or another pending invitation), the server forwards an [`game_invite`](#protocol-game-invite-server-client) action to the invitee, and the invitee’s client displays a notification toast.
Otherwise, the server cancels the invitation and replies to the inviter's client with [`game_invite_canceled`](#protocol-game-invite-canceled).

The inviter is redirected to **Duel page** after sending the invitation. From there the inviter can cancel the invitation by sending [`cancel_game_invite`](#protocol-cancel-game-invite) to the server. On success, the server replies with [`game_invite_canceled`](#protocol-game-invite-canceled).

<p align="center">
  <img src="../../assets/ui/chat-game-invitation-waiting.png" alt="Chat - Like message" width="480px" />
</p>

The invitee can accepts or declines the invitation from **Notification list** in Navbar selecting **Accept** or **Decline**. The client sends [`reply_game_invite`](#protocol-reply-game-invite) with the user's response. 

<img src="../../assets/ui/notification-game-invitation.png" alt="Game invitation" width="240px" />

On **accept** response, the server revalidates the data, creates a new game room, then broadcasts a [`game_accepted`](#protocol-game-accepted) event to both users, including `game_id` which allows them to navigate to the game page.   
On **decline** response, the server revalidates the data, then broadcasts a [`game_declined`](#protocol-game-declined) event.

<br />

### User Presence system

User presence is updated based on user activity and inactivity.   

Each meaningful API request and WebSocket event checks if a user is considered offline in database. If so, the status changes to **online** and a [`user_online`](#protocol-user-online) event is boroadcasted to all active users.   
A user becomes offline immedidately when all sessions are closed, and also via a periodic check. A cronjob runs every minute to mark users as **offline** if their last activity timestamp is older than 30 minutes, boradcasting [`user_offline`](#protocol-user-offline) events. 

Upon receiving these events, the client updates the corresponding user's online status indicators.

For more details about **cronjob**, see [CRONTAB doc](../server/CRONTAB.md).

<br />

## Implementation details
🛠️👷🏻‍♂️
### Backend

Server of the project is able to handle WebSockets thanks to the Django Channels integration (TODO: link to the .md file that describes in high level the dependencies of the project). User events are governed by the `UserEventsConsumer`, which is responsible for handling and distributing different events for different groups. It uses JWT authentication, like [the rest of the consumers in the project](./USER_MANAGEMENT.md#jwt-authentication).

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

<br />

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

### Frontend

The frontend is composed of modular components that work to provide real-time chat, notifications, game invitations, and presence updates across the application.

#### ■ Chat components

The chat feature is structured around a central `Chat` component that coordinates several supporting components. Together, they provide user search, conversation management, real-time messaging, and game invitations.

##### `Chat`:   

The `Chat` component is the entry point of the chat interface containing the list of conversations (`ChatList`), the message area (`ChatMessageArea`) and the game invitation form modal (`InviteGameModal`).   
It initializes the chat  by fetching the data from the server, determines which conversation to display in the message area, and updates dynamically when new messages arrive or when the user blocks/unblocks others.   
The layout adapts seamlessly to different screen sizes to ensure a consistent experience across devices.

##### `ChatList`:   

Displays the user’s conversations, including the last message information, unread message counts and online status indicators. When a conversation is selected, its messages are loaded into the message area.
It also provides a search function, allowing the user to find existing conversations or start new ones.

##### `ChatMessageArea`:  

Manages the content of a conversation by displaying messages, user information, and interaction options such as navigating to the profile page, inviting to a Pong Duel, blocking/unblocking the user.   
This component is a scrollable container that shows messages in chronological order. When a new message arrives, it is loaded dynamically and the view scrolls to the bottom. The messages are considered read once the user scrolls through them.

##### `InviteGameModal`:  
See [Game invitations components section](#game-invitations-components)

<br />

#### ■ Notifications components

The notifications feature revolves around a notification button (`NotificationButton`) in the Navbar that toggles the visibility of the notification list (`NotificationsList`). They provide real-time updates, and actions for different types of notifications.

##### `NotificationButton`:

Serves as the entry point to the notification system, showing an unread badge when the user has unread notifications. Clicking the button reveals the notification list.


##### `NotificationsList`:  

Displays notifications in a scrollable container and loads additional items are when the user scrolls, providing a seamless infinite-scroll experience.   
This list supports switching between **All** and **Unread** tabs, updating the content based on the selected tab. Users can also mark all notifications as read with a single action, which updates both the UI and the server state.

##### `NotificationListItem`

Represents a single notification and adapts its content and actions depending on its type (new friend, game invitation, or new tournament).   
**New friend** notifications link to the friend's profile, **game invitations** allow the user to accept or decline, and **new tournament** notifications include a link to navigate to registration. 

##### `Notification Toast`:  

Provides brief pop-ups for newly received notifications, giving immediate feedback even if the notification list dropdown is closed.

<br />

#### ■ Game invitations components

Two components are available for selecting game options and sending invitations: On the `Chat` page, by opening the `InviteGameModal`, or on the `DuelMenu` page where the invitation form is embedded directly in the interface.

After sending an invitation, the inviter is redirected to the `Duel` page, which shows the opponent's information and updates dynamically once the invitee responds. For the invitee, accepting the invitation from the notification list triggers a redirection to the `Duel` page.
When the invitation is accepted and the server confirms the creation of a game room, a countdown starts on both clients, then both are redirected to the game. 

<br />

#### ■ Real-time presence system components

The real-time presence system keeps users informed about the online status of other users across the UI. Status indicators update dynamically whenever a user comes online or goes offline.

**Online status indicators** appear in the following components to reflect users’ current presence:
- `Profile` (updates in real time)
- `UserSearch` in Navbar
- `ChatListItem` (updates in real time)
- `ChatMessageArea` (updates in real time)
- `ChatUserSearch`
- User search results in `DuelMenu`

Each indicator updates in real time, ensuring consistent status information wherever users interact.

<br />

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

The application establishes a single WebSocket connection at `/ws/events`, which is responsible for delivering real-time events, including chat messages, reactions, friend additions, game invitations, notifications, and presence updates.  
The connection is opened when the user logs in and stays active until logout, tab closure, or network loss.

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

<a id="protocol-new-message-client-server"></a>
- **new_message**
  | Data field  | Type     | Description                           |
  |:------------|:---------|:------------------------------------- |
  | `chat_id`   | `string` | id of the chat room                   |
  | `content`   | `string` | message content                       |
  | `timestamp` | `string` | Timestamp indicating when it was sent |

<a id="protocol-like-message-client-server"></a>
- **like_message**:
  | Data field | Type      | Description             |
  |:-----------|:----------|:------------------------|
  | `chat_id`  | `string`  | id of the chat room     |
  | `id`       | `string`  | id of the liked message |

<a id="protocol-unlike-message-client-server"></a>
- **unlike_message**

  | Data field | Type      | Description                |
  |:-----------|:----------|:---------------------------|
  | `chat_id`  | `string`  | id of the chat room        |
  | `id`       | `string`  | id of the un-liked message |

<a id="protocol-read-message"></a>
- **read_message**

  | Data field | Type      | Description            |
  |:-----------|:----------|:-----------------------|
  | `chat_id`  | `string`  | id of the chat room    |
  | `id`       | `string`  | id of the read message |

<br />

SERVER --> CLIENT

<a id="protocol-new-message-server-client"></a>
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

<a id="protocol-like-message-server-client"></a>
- **`like_message`**

  | Data field  | Type       | Description                              |
  |:------------|:-----------|:---------------------------------------- |
  | `chat_id`   | `string`   | id of the chat room                      |
  | `id`        | `string`   | id of the message                        |
  | `is_liked`  | `boolean`  | true if the message is liked, else false |

---

#### Notifications

CLIENT --> SERVER

<a id="protocol-read-notification"></a>
- **`read_notification`**

  | Data field | Type     | Description            |
  |:-----------|:---------|:-----------------------|
  | `id`       | `string` | id of the notification |

<br />

SERVER --> CLIENT

<a id="protocol-new-friend"></a>
- **`new_friend`**

  | Data field  | Type       | Description                                            |
  |:------------|:-----------|:------------------------------------------------------ |
  | `username`  | `string`   | username of the user who added the receiver as friend  |
  | `nickname`  | `string`   | nickname of the user who added the receiver as friend  |

<br />

<a id="protocol-new-tournament"></a>
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

<a id="protocol-game-invite-client-server"></a>
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

SERVER --> CLIENT

<a id="protocol-game-invite-server-client"></a>
- **`game_invite`**

  | Data field | Type       | Description               |
  |:-----------|:-----------|:--------------------------|
  | `username` | `string`   | username of the inviter   |
  | `nickname` | `string`   | nickname of the inviter   |
  | `avatar`   | `string`   | avatar url of the inviter |

<br />

<a id="protocol-game-accepted"></a>
- **`game_accepted`**

  | Data field | Type       | Description.                      |
  |:-----------|:-----------|:----------------------------------|
  | `game_id`  | `string`   | id of the game room for this duel |
  | `username` | `string`   | username of the invitee           |
  | `nickname` | `string`   | nickname of the invitee           |
  | `avatar`   | `string`   | avatar url of the invitee         |

<br />

<a id="protocol-game-declined"></a>
- **`game_declined`**

  | Data field | Type       | Description.                      |
  |:-----------|:-----------|:----------------------------------|
  | `username` | `string`   | username of the invitee           |
  | `nickname` | `string`   | nickname of the invitee           |

<br />

<a id="protocol-game-invite-canceled"></a>
- **`game_invite_canceled`**

  | Data field  | Type               | Description                                  |
  |:------------|:-------------------|:---------------------------------------------|
  | `username`  | `string` \| `null` | username of the inviter                      |
  | `nickname`  | `string` \| `null` | nickname of the inviter                      |
  | `message`   | `string` \| `null` | reason why the server cancels the invitation |
  | `client_id` | `string`           | id of the websocket instance of the browser tab from which the invitation is sent |

<br />

#### User presence system

SERVER --> CLIENT

<a id="protocol-user-online"></a>
- **`user_online`**
  | Data field  | Type     | Description                                      |
  |:------------|:---------|:-------------------------------------------------|
  | `username`  | `string` | username of the user whose status becomes online |

<br />

<a id="protocol-user-offline"></a>
- **`user_offline`**
  | Data field  | Type     | Description                                       |
  |:------------|:---------|:--------------------------------------------------|
  | `username`  | `string` | username of the user whose status becomes offline |

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
      Chat HTTP API, WebSocket chat layer
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
      Chat UI design, frontend development, documentation
    </td>
  </tr>
</table>
