# Components

## Router
- [x] Update navigation to pages that need authentication
- [x] Navbar and content rendering should not call refresh token twice (navbar --> async function? / promise?)

---------------------------------------------------------------------

## Auth manager
-[x] Add message to UI after refresh token failed

---------------------------------------------------------------------

## API
- [x] Refresh Token handling
- [x] Remove reflesh token sending from login and register
- [] 500 response handling

---------------------------------------------------------------------

## Navbar
- [x] Dropdown menu is hidden by Chat message header on Chat page
- [x] Update login status depending on login status

---------------------------------------------------------------------

## Landing
- [x] JWT (check login status)

---------------------------------------------------------------------

## Login
- [x] Adjust width
- [x] CSRF Token handling
- [x] Error handling
- [x] email login
- [x] Fix parsing of Error message from server
- [x] Forbitten letters or format for username? (e.g. email format for username)
- [] Forgot password
- [] Unit test (input validation)

---------------------------------------------------------------------

## Logout
- [x] Clear CSRF token
- [x] logout API request

---------------------------------------------------------------------

## Register
- [X] Adjust width
- [x] 422 handling
- [x] Password length check
- [x] 422 Error message check
- [] Nickname input?
- [x] Unit test (input validation)
- [x] Fix parsing of Error message from server

---------------------------------------------------------------------

## Settings
- [X] Adjust width
- [X] Restrict other users to access to the page (remove username from url)
- [X] Add nickname input
- [X] Add old password input
- [X] Hide password & email change for OAuth users
- [~] Add 2FA activate toggle
- [] New avatar upload settings (new_profile_picture)
- [] 401 handling
- [] 404 handling
- [] 413 handling
- [] 422 handling
- [] Unit test (input validation)

---------------------------------------------------------------------

## Profile

- [x] Add auth check before rendering

### Error handling
- [x] 404 handling
- [x] Check 404 server response (it returns 500 now)
- [x] Rendering of user profile page who is blocking me

### User info
- [x] username & nickname
- [] Title

### User actions
- [x] Add firend
- [x] Remove friend
- [x] Block friend
- [x] Unblock friend
- [] Send message

### Stat
- [x] Pie Graph
- [] Line graph

### Game History
- [] Better solution for Scroll thead sticky
- [] Tournament history table

---------------------------------------------------------------------

## Friends list
- [] User search by username

---------------------------------------------------------------------

## Friends list
- [] Get list from server
- [] Handle see more making a new request (To show more than first 10 friends)

---------------------------------------------------------------------

## Chat

- [] Add auth check before rendering
- [x] Websocket
- [] Add new chat (user search ?)
- [] Block user on chat
- [] Resize event listner

## WebSocket

-[] Handle auto close
