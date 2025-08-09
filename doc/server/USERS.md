# Users App Documentation
The users app is the cornerstone of the application, managing user authentication, authorization, and profiles. It provides a comprehensive suite of features, including standard email/password registration, Multi-Factor Authentication (MFA), and third-party login via OAuth 2.0.

## Core Models
The app's functionality is centered around two primary models: `User` and `Profile`, which share a one-to-one relationship.

- `User`: Extending Django's default `AbstractUser`, this model is dedicated to authentication and authorization. It stores essential credentials like `username`, `email`, and `password`, as well as security-related fields for MFA and password resets. It also links to an `OauthConnection` model for users who sign up via third-party services.
- `Profile`: This model stores application-specific data related to a user's activity (gaming, friends, chatting etc) within the platform. This model is the most used model in whole application, connected to all the actual logic within it. Key fields include `elo` rating, `friends` and `blocked_users` lists, `profile_picture`, and presence status (`is_online`, `last_activity`). A `Profile` is automatically created for every `User` via a signal.
- `RefreshToken`: Manages the lifecycle of JWTs. It handles the creation of short-lived access tokens and long-lived refresh tokens, as well as their verification, rotation and revocation upon logout. It is used mainly in the middleware:
    - `JWTEndpointsAuthMiddleware`: Secures all HTTP API endpoints by validating the access token provided in cookies. Populates each `request` with the user data.
    - `JWTWebsocketAuthMiddleware`: Secures all WebSocket endpoints using the access token from cookies, populating the `scope` for real-time services like chat and the actual game.

## Key Features & API Endpoints
The users app exposes a range of endpoints to manage user data and social interactions.

### JWT Authentication
The primary authentication mechanism is based on JSON Web Tokens (JWT).

- `POST /api/signup`: Creates a new user account with a username, email, and password, if all the fields are valid. For security reasons, there are restrictions placed on passwords, which are specified in `settings.py`. Upon success, it returns JWTs in secure, HTTP-only cookies to start a session.
- `POST /api/login`: Authenticates a user with their credentials. If MFA is enabled, it initiates the two-factor flow by sending a code. Otherwise, it returns user data and sets secure HTTP-only JWT cookies.
- `DELETE /api/logout`: Securely logs out the user by revoking the refresh token and clearing the JWT cookies from the browser.
- `POST /api/refresh`: Rotates the refresh token. It takes a valid `refresh_token` cookie and issues a new pair of access and refresh tokens to maintain the session without requiring the user to log in again.
- `POST /api/forgot-password`: Allows users to request a password reset. It takes an email address and sends a password reset link with a unique token.
- `POST /api/reset-password/{token}`: Allows a user to set a new password using a valid token received via email. The token expires after 10 minutes.

### User Profiles and Settings
- `GET /api/users`: Retreives paginated list of users filtered based on query parameters.
- `GET /api/users/{username}`: Retrieves the full public profile for a specified user, including game statistics like win/loss records, elo history, and best/worst enemies.
- `GET /api/users/{username}/settings`: Allows an authenticated user to see their current settings, such as their nickname, email, avatar.
- `POST /api/users/{username}/settings`: Allows an authenticated user to update their own profile information, such as their nickname, email, password, and avatar. Avatar uploads are validated for size (under 10MB) and file type (.png, .jpg, .webp).
- `GET /api/self`: A protected endpoint that returns the profile data for the currently authenticated user, including private information like the number of unread messages and notifications, as well as game participation.

### Multi-Factor Authentication (MFA)
For enhanced security, users can enable email-based MFA.
See MFA docs [here](./MFA.md).

### OAuth 2.0 Integration
Users can register and log in using their GitHub or 42 School accounts.
See OAuth docs [here](./OAUTH2.md).

### Social Features
- Friends List:
    - `GET /api/users/{username}/friends`: Fetches a user's list of friends.
    - `POST /api/users/{username}/friends`: Adds a new friend. This action also creates a new_friend notification for the added user.
    - `DELETE /api/users/{username}/friends/{friend_to_remove}`: Removes a friend.

- User Blocking:
    - `GET /api/users/{username}/blocked_users`: Retrieves the list of users blocked by the authenticated user.
    - `POST /api/users/{username}/blocked_users`: Blocks a user, which also removes them from the friend list if they were friends.
    - `DELETE /api/users/{username}/blocked_users/{blocked_user_to_remove}`: Unblocks a user.

### Presence System
The application tracks and broadcasts user online status in real-time.
