# User Management System Documentation
The user management system is the cornerstone of the project, managing user authentication, authorization, and profiles. It provides a comprehensive suite of features, including standard email/password registration, Multi-Factor Authentication (MFA), and third-party login via OAuth 2.0.

Every other part of the project is affected by this syste; after all, the ability to correctly identify users and deal with their data is a requirement for any modern app.

## Table of contents
- [Key features](#key-features)
    - [JWT Authentication](#jwt-authentication)
    - [Authentication Endpoints And CSRF Protection](#authentication-endpoints-and-csrf-protection)
    - [Password Restoration](#password-restoration)
    - [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
    - [OAuth 2.0 Integration](#oauth-20-integration)
    - [Social Networking Elements](#social-networking-elements)
    - [User Search And User Profiles](#user-search-and-user-profiles)
    - [User Settings](#user-settings)
    - [Presence System](#presence-system)
- [Implementation Details](#Implementation-details)
    - [Backend](#backend)
        - [Core Models](#core-models)
        - [JWT Authentication Middleware](#jwt-authentication-middleware)
    - [Frontend](#frontend)
- [Testing](#testing)
- [Contributors](#contributors)

## Key Features
### JWT Authentication
The primary authentication mechanism is based on [JSON Web Tokens (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token). On [creating account or logging in](authentication-endpoints-and-csrf-protection), `access_token` and `refresh_token` are issued.

`access_token` is JWT, and contains signature and identity of the user. It's short-lived for security reasons. It has companion cookie (also JWT): `refresh_token`, which is long-lived, may be revoked by the server, and is responsible for refreshing the short-lived `access_token`. Refreshing is not done automatically: the client must call  special endpoint (`POST /api/refresh`), after which new `access_token` is granted, while the current `refresh_token` is rotated (the current one is revoked & the new one is issued).

Both tokens are [HTTP-only](https://owasp.org/www-community/HttpOnly) and [secure](https://en.wikipedia.org/wiki/Secure_cookie) cookies.

The benefits of the JWT authentication system (with refresh tokens) compared to the traditional session-based system is that it's easier on the database. It's not stateless, as pure JWT authentication, but pure stateless JWT authentication is not suitable for applications such as pong platform. Having refresh tokens is important to security ([video with simple explanation](https://www.youtube.com/watch?v=T0k-3Ze4NLo)).

### Authentication Endpoints And CSRF Protection
Server provides multiple endpoints for the necessary for secure creation, logging in and logging outof users. `signup` and `login` endpoints also issue [CSRF token (cookies-to-header approach)](https://en.wikipedia.org/wiki/Cross-site_request_forgery#Cookie-to-header_token), another security measure of the project.

The way CSRF protection works is that malicious side that attempts CSRF attack cannot read the cookies from another domain (Ponggers, in this case). However, the server expects it to be send in the header on each request. If they don't match, request fails, invalidating the attack. [Additional information.](https://stackoverflow.com/a/49301318)

- `POST /api/signup`: Creates a new user account with a username, email, and password, if all the fields are valid. For security reasons, there are restrictions placed on passwords, which are specified in `settings.py`. Upon success, it returns JWTs in secure, HTTP-only cookies to start a session. Doesn't require CSRF token and issues a CSRF token.
- `POST /api/login`: Authenticates a user with their credentials. If MFA is enabled, it initiates the two-factor flow by sending a code. Otherwise, it returns user data and sets secure HTTP-only JWT cookies. Doesn't require CSRF token and issues a CSRF token.
- `DELETE /api/logout`: Securely logs out the user by revoking the refresh token and clearing the JWT cookies from the browser.
- `POST /api/refresh`: Rotates the refresh token. It takes a valid `refresh_token` cookie and issues a new pair of access and refresh tokens to maintain the session without requiring the user to log in again. Refresh tokens aren't refreshed automatically, so the client has to call to this endpoint periodically.

### Password Restoration
- `POST /api/forgot-password`: Allows users to request a password reset. It takes an email address and sends a password reset link with a unique token.
- `POST /api/reset-password/{token}`: Allows a user to set a new password using a valid token received via email. The token expires after 10 minutes.

### Multi-Factor Authentication (MFA)
For enhanced security, users can enable email-based MFA.
See MFA docs [here](./MFA.md).

### OAuth 2.0 Integration
Users can register and log in using their GitHub or 42 School accounts.
See OAuth docs [here](./OAUTH2.md).

### Social Networking Elements
There are social networking features, like the ability to add friends, block annoying users or [chat with other users](./CHAT_AND_LIVE_EVENTS.md).

Friends are special users who are "bookmarked" by the user. There are no special effects, but befriended users are displayed in a list on the navbar for quick access to their profile and/or chat.
Friendship feature has following endpoints:
- `GET /api/users/{username}/friends`: Fetches a user's list of friends.
- `POST /api/users/{username}/friends`: Adds a new friend. This action also creates a `new_friend` [notification](./CHAT_AND_LIVE_EVENTS.md) for the added user.
- `DELETE /api/users/{username}/friends/{friend_to_remove}`: Removes a friend.

Blocking user have more effects than befriending them; blocked users are unable to chat or invite people who blocked them. Blocking user immediately hides the chat between two of them, as well hides them from the [search](#user-search-and-user-profiles).
Blocking feature has following:
- `GET /api/users/{username}/blocked_users`: Retrieves the list of users blocked by the authenticated user.
- `POST /api/users/{username}/blocked_users`: Blocks a user, which also removes them from the friend list if they were friends.
- `DELETE /api/users/{username}/blocked_users/{blocked_user_to_remove}`: Unblocks a user.

### User Search And User Profiles
Each of the users have a lot of different data that is associated with them: their username, nickname, elo, winrate, list of games, friendship/block status relative to the user currently viewing the profile... It is diplayed neatly on their profile page, which can be visited by other ([non-blocked](#social-networking-elements)) users.
- `GET /api/users`: Retreives paginated list of users filtered based on query parameters. Users can be searched by their nickname or username.
- `GET /api/users/{username}`: Retrieves the full public profile for a specified user, including game statistics like win/loss records, elo history, and best/worst enemies.
- `GET /api/self`: A protected endpoint that returns the profile data for the currently authenticated user, including private information like the number of unread messages and notifications, as well as whther they currently play any game/hold a matchmaking queue or not.

### User Settings
Users are able to change their settings:
1. Password, and they are required to input their old password.
2. Username, which is their unique identifier.
3. Nickname, which is a non-unique displayed name of the user.
4.profile picture.
5. [MFA status](#multi-factor-authentication-mfa), if they wish to opt-in or opt-out of the feature.
All of the new settings must conform to the constraints for each of the fields, otherwise they are rejected.
- `GET /api/users/{username}/settings`: Allows an authenticated user to see their current settings, such as their nickname, email, avatar.
- `POST /api/users/{username}/settings`: Allows an authenticated user to update their own profile information, such as their nickname, email, password, and avatar. Avatar uploads are validated for size (under 10MB) and file type (.png, .jpg, .webp).

### Presence System
The application tracks and broadcasts user online status in real-time. TODO: link to the CHAT_AND_LIVE_EVENTS.md.

## Implementation Details
### Backend
Backend side of the user management system in this project is implemented with `users` Django app (TODO: link to the high level explanation of the tech stack/overall backend overview). This app interacts with all other Django apps in the project, and was the first one that was developed.

#### Core Models
The app's functionality is centered around two primary models: `User` and `Profile`, which share a one-to-one relationship.

- `User`: Extending Django's default `AbstractUser`, this model is dedicated to authentication and authorization. It stores essential credentials like `username`, `email`, and `password`, as well as security-related fields for MFA and password resets. It also links to an `OauthConnection` model for users who sign up via third-party services (42 or Github).
- `Profile`: This model stores application-specific data related to a user's activity (gaming, friends, chatting etc) within the platform. This model is the most used model in whole application, connected to all the actual logic within it. Key fields include `elo` rating, `friends` and `blocked_users` lists, `profile_picture`, and presence status (`is_online`, `last_activity`). A `Profile` is automatically created for every `User` via a signal.
- `RefreshToken`: Manages the lifecycle of JWTs. It handles the creation of short-lived access tokens and long-lived refresh tokens, as well as their verification, rotation and revocation upon logout.
 There are two middlewares on the server that are responsible for handling requests: the one is for HTTP requests, and another is for WebSocket requests:

#### JWT Authentication Middleware
Middleware is triggered on every request/connection. Authentication middleware identifies the user who made request and restricts access of anonymous users to the system.

- `JWTEndpointsAuthMiddleware`: Secures all HTTP API endpoints (except the ones you need to use to login in the first place) by validating the `access_token` provided in cookies. Populates each `request` with the user data.
- `JWTWebsocketAuthMiddleware`: Secures all WebSocket endpoints using the `access_token` from cookies, populating the `scope` for real-time services like chat and the actual game.

## Frontend

## Testing
`make tests-users` will initialize the tests related to the users management system.

---

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
      JWT authentication, auth HTTP API, social networking elements, documentation
    </td>
  </tr>

  <tr>
    <td align="center" style="padding: 8px; vertical-align: middle;">
      <a href="https://github.com/faboussard" style="text-decoration: none;">
        <img src="../../assets/profile/faboussard.png" width="48px;" alt="Fanny_BOUSSARD"/><br />
        <sub><b>faboussard</b></sub>
      </a>
    </td>
    <td style="padding-left: 16px; vertical-align: middle;">
      MFA, OAuth2, JWT authentication, auth HTTP API
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
      Presence system
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
      UI design with Figma, everything on the frontend side for all of the features, documentation
    </td>
  </tr>
</table>
