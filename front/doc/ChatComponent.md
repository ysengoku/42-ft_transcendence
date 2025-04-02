# Chat component

## Overview

The `Chat` component is a custom web component that delivers a dynamic chat interface. It orchestrates multiple sub-components to display chat list and messages and handles real-time message updates.

## Dependencies

- **@api**: Provides methods (`apiRequest`) and endpoints (`API_ENDPOINTS`) to communicate with the backend.
- **@socket**: Manages WebSocket connections for real-time messaging.
- **components**: Imports all necessary sub-components.

## Architecture & Data flow

## Sub-components Breakdown

### Chat list

The `ChatList` sub-component displays the preview of the logged-in user's chats. Each preview is composed by `ChatListItem` component.

### Chat message area

The `ChatMessageArea` component includes:
- Header: Display user's nickname, username, avatar and buttons (invite to duel and block/unblock user).
- Messages: Display chat messages
- Input (`ChatMessageInput`): Allows the logged-in user to send a new message.

## API and WebSocket communication

## User actions & Events
