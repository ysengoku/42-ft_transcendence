# OAuth 2.0 Authentication Documentation

## Overview

OAuth 2.0 implementation for third-party authentication using GitHub and 42 School APIs. This system allows users to register and login using their existing accounts from these platforms.

**Reference:** [RFC 6749 - OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)

## Supported Platforms

### 42 School API
- **Platform ID:** `42`
- **Authorization URL:** `https://api.intra.42.fr/oauth/authorize`
- **Token URL:** `https://api.intra.42.fr/oauth/token`
- **User Info URL:** `https://api.intra.42.fr/v2/me`
- **Scopes:** `profile`

### GitHub API
- **Platform ID:** `github`
- **Authorization URL:** `https://github.com/login/oauth/authorize`
- **Token URL:** `https://github.com/login/oauth/access_token`
- **User Info URL:** `https://api.github.com/user`
- **Scopes:** `user:email`

## OAuth 2.0 Flow

### 1. Authorization Request
**Frontend initiates OAuth flow:**
- User clicks "Login with GitHub" or "Login with 42" button
- Frontend calls `/api/users/oauth/authorize/{platform}`
- Backend generates unique state and returns authorization URL
- Frontend redirects user to OAuth provider

### 2. User Authorization
- User logs into their GitHub/42 account
- User grants permissions to the application
- OAuth provider redirects back to callback URL

### 3. Authorization Callback
- OAuth provider sends authorization code and state
- Backend validates state and exchanges code for access token
- Backend retrieves user profile information
- Backend creates/updates user account and issues JWT tokens
- User is redirected to dashboard with authentication cookies

## API Endpoints

### Initiate OAuth Authorization
**Endpoint:** `GET /api/users/oauth/authorize/{platform}`
**Authentication:** None required
**Platforms:** `github`, `42`

### OAuth Callback Handler
**Endpoint:** `GET /api/users/oauth/callback/{platform}`
**Authentication:** None required
**Platforms:** `github`, `42`

**Query Parameters (provided by OAuth provider):**
- `code`: Authorization code from OAuth provider
- `state`: State parameter for CSRF protection
- `error` (optional): Error code if authorization failed
- `error_description` (optional): Human-readable error description

**Success Response:**
- HTTP 302 Redirect to dashboard with JWT cookies set
- Cookies: `access_token`, `refresh_token`
- Redirect URL: `{HOME_REDIRECT_URL}` (typically `/dashboard`)

**Error Response:**
- HTTP 302 Redirect to error page with error details
- Redirect URL: `{ERROR_REDIRECT_URL}?error={error_message}&code={status_code}`

**Error Codes:**
- `404`: Platform not found or OAuth provider unavailable
- `408`: State expired (5 minutes timeout)
- `422`: Invalid request parameters, state mismatch, or OAuth provider error
- `503`: Failed to create user account or server error

## Implementation Details

### Backend Implementation

**Key Files:**
- `server/users/router/endpoints/oauth2.py`: OAuth endpoints
- `server/users/models/oauth_connection.py`: OAuth connection model and logic

**Database Model (`OauthConnection`):**
- `state`: Unique state string for CSRF protection (64 chars)
- `status`: Connection status (`pending` or `connected`)
- `connection_type`: Platform type (`42`, `github`, `regular`)
- `oauth_id`: User's ID from OAuth provider
- `user`: Link to internal User model
- `date`: Connection creation timestamp

**Core Functions:**
- `oauth_authorize()`: Generates authorization URL and creates pending connection
- `oauth_callback()`: Handles OAuth callback and completes authentication
- `check_api_availability()`: Health check for OAuth providers
- `get_oauth_config()`: Retrieves platform-specific OAuth configuration

### Frontend Integration

**OAuth Login Flow:**
1. User clicks OAuth login button (GitHub/42 School)
2. Frontend calls `/api/users/oauth/authorize/{platform}`
3. Frontend redirects to received authorization URL
4. OAuth provider handles user authentication
5. Provider redirects to callback URL with code/state
6. Backend processes callback and sets authentication cookies
7. User is redirected to dashboard if successful, error page if failed


### OAuth Application Setup

#### GitHub OAuth App Setup
1. **Create Application:**
   - Go to: https://github.com/settings/applications/new
   - **Application name:** "Peacemakers Ponggers"
   - **Homepage URL:** `https://localhost:1026`
   - **Callback URL:** `https://localhost:1026/api/users/oauth/callback/github`

2. **Configuration:**
   - Copy Client ID and Client Secret to environment variables
   - Ensure callback URL matches exactly

#### 42 School OAuth App Setup
1. **Create Application:**
   - Go to: https://profile.intra.42.fr/oauth/applications/new
   - **Name:** "Peacemakers Ponggers"
   - **Redirect URI:** `https://localhost:1026/api/users/oauth/callback/42`
   - **Scopes:** Check "profile"

2. **Configuration:**
   - Copy UID (Client ID) and Secret to environment variables
   - Ensure redirect URI matches exactly

### Django Settings Configuration
```python
OAUTH_CONFIG = {
    "github": {
        "client_id": os.getenv("GITHUB_CLIENT_ID"),
        "client_secret": os.getenv("GITHUB_CLIENT_SECRET"),
        "auth_uri": "https://github.com/login/oauth/authorize",
        "token_uri": "https://github.com/login/oauth/access_token",
        "user_info_uri": "https://api.github.com/user",
        "redirect_uris": f"{BASE_URL}/api/users/oauth/callback/github",
        "scopes": ["user:email"],
    },
    "42": {
        "client_id": os.getenv("API42_CLIENT_ID"),
        "client_secret": os.getenv("API42_CLIENT_SECRET"),
        "auth_uri": "https://api.intra.42.fr/oauth/authorize",
        "token_uri": "https://api.intra.42.fr/oauth/token",
        "user_info_uri": "https://api.intra.42.fr/v2/me",
        "redirect_uris": f"{BASE_URL}/api/users/oauth/callback/42",
        "scopes": ["public"],
    },
}
```

## User Data Handling

### User Profile Creation
When a user authenticates via OAuth for the first time:

1. **User Creation:**
   - Extract username from OAuth profile (`login` field)
   - Generate unique username if conflicts exist
   - Create User and UserProfile records
   - Link OAuth connection to user account

2. **Profile Picture Handling:**
   - Download avatar from OAuth provider
   - Save to user's profile picture field
   - Fallback to default avatar on download failure
   - Support for GitHub (`avatar_url`) and 42 School (`image.link`)

3. **Data Storage:**
   - OAuth ID stored for future authentication
   - Access tokens are not permanently stored
   - User profile data synced from OAuth provider

### Returning User Authentication
For existing users with OAuth connections:

1. **User Lookup:**
   - Find user by OAuth ID from provider
   - Verify OAuth connection exists and is valid
   - Update any changed profile information

2. **Authentication:**
   - Generate new JWT access and refresh tokens
   - Set authentication cookies
   - Redirect to dashboard

## Security Considerations

### CSRF Protection
- **State Parameter:** Unique 64-character random string generated for each OAuth request
- **State Validation:** Backend verifies state matches stored value before processing
- **State Expiry:** States expire after 5 minutes to prevent replay attacks
- **Database Storage:** States stored in database with creation timestamp

### Token Security
- **Access Token Handling:** OAuth access tokens used only for profile retrieval, not stored
- **JWT Tokens:** Application uses its own JWT tokens for session management
- **Cookie Security:** Authentication cookies set with appropriate security flags
- **Refresh Tokens:** Stored securely in database for long-term authentication

### Error Handling
- **Provider Errors:** OAuth provider errors captured and displayed to user
- **Network Timeouts:** Graceful handling of network timeouts (10-second limits)
- **API Availability:** Health checks before initiating OAuth flow
- **Error Redirection:** Errors redirect to custom error page with sanitized messages

### Input Validation
- **Platform Validation:** Only supported platforms (`github`, `42`) accepted
- **State Validation:** State format and expiry validated
- **Code Validation:** Authorization codes validated before token exchange
- **User Data Validation:** OAuth profile data validated before account creation

## Error Scenarios and Handling

### Common Error Cases

1. **User Denies Authorization:**
   - OAuth provider sends `error=access_denied`
   - User redirected to error page with explanation
   - Option to retry OAuth flow

2. **Invalid OAuth Configuration:**
   - Incorrect client ID/secret returns `invalid_client`
   - Misconfigured redirect URI returns `redirect_uri_mismatch`
   - Error logged for developer investigation

3. **Network/API Issues:**
   - OAuth provider API unavailable
   - Network timeouts during token exchange
   - Graceful error messages displayed to user

4. **Account Conflicts:**
   - OAuth ID already linked to different account
   - Username conflicts resolved automatically
   - Clear error messages for irresolvable conflicts

