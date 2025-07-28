# CHAT

`Chat` module handles every message the user can get, as an event manager.
Its websockets connects at the connection.

## Overview

The consumer is EventConsumer, it receives public announcements and private messages.
It handles notifications, chat message, like/unlike actions.

## `EventConsumer`

### Functionality

#### Receives every websocket message

- First validate data with the Validator.
- Then decides to accept or refuse the user. Use standard close codes.
- Prepare peoples' chats and adds them in.
- Message received trigger differents actions.

#### Adds user to channels

User is added to :

- group chats
- online users
- their own personal channel for direct messages

#### Data Handling

Data is verified by the Validator, which return a boolean.
If True, the consumer lets the user in.
If False, the user gets disconnected from the websocket with the close code "BAD_DATA".
If the websocket receives an unknown action, it closes the connection with this code.

#### Online status

Every time the user opens a tab/browser, a new websocket connection opens.
To show the user offline when they log out, a user counter is used.
It increments and decrements on opening/closing tabs/browser.
If users are inactive for more than 30 minutes, the crontab disconnects them.
It also set their connection count to 0.
