# Components

## Router
- [] Update navigation to pages that need authentication

---------------------------------------------------------------------

## API
- [] Refresh Token handling

## Navbar
- [] Dropdown menu is hidden by Chat message header on Chat page

---------------------------------------------------------------------

## Landing
- [] JWT (check login status)

---------------------------------------------------------------------

## Login
- [X] Adjust width
- [x] CSRF Token handling
- [x] Error handling
- [] email login
- [] Forgot password
- [] Unit test (input validation)

---------------------------------------------------------------------

## Logout
- [x] Clear CSRF token
- [] logout API request

---------------------------------------------------------------------

## Register
- [X] Adjust width
- [x] 422 handling
- [x] Password length check
- [x] 422 Error message check
- [~] Nickname input
- [x] Unit test (input validation)
- [] Error message from server parsing

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

### Error handling
- [x] 404 handling
- [x] Check 404 server response (it returns 500 now)
- [] Rendering of user profile page who is blocking me

### User info
- [] username & nickname
- [] Title

### User actions
- [] Add firend
- [] Remove friend
- [] Block friend
- [] Unblock friend
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

## Chat

- [] Websocket
- [] Add new chat (user search ?)
- [] Block user on chat
- [] Resize event listner
