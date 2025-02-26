# Components

## Pages
- [] Loading
- [x] 404

## Static images
- [] Path to static image sent by server

---------------------------------------------------------------------

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
- [x] Rendering for mobile

### Friends list
- [x] Get list from server
- [x] Handle see more making a new request (To show more than first 10 friends)
- [] Delete modal

### User search
- [x] Add user search button and dropdown to Navbar
- [x] User search function
- [x] Adjust style for search bar

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
- [x] Mfa handling
- [] Resend Mfa error handling
- [] Style mfa code form

- [x] Unit test (input validation)

---------------------------------------------------------------------

## Logout
- [x] Clear CSRF token
- [x] logout API request
- [x] Add refresh token if 401

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
- [x] New avatar upload settings (new_profile_picture)
- [x] API request
- [x] Empty input case handling
- [x] Add 2FA activate toggle
- [x] 413 handling
- [x] 422 handling
- [x] Error handling
- [] Unit test (input validation)
- [] Disable submit button if there is no change

---------------------------------------------------------------------

## Profile

- [x] Add auth check before rendering
- [] Layout for Mobile

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

## Alert
- [x] Replace showErrorMessage to showAlertMessage
- [x] Delete errorMessage file

---------------------------------------------------------------------

## WebSocket

-[] Handle auto close

### Chat
- [x] Add auth check before rendering
- [x] Websocket
- [x] Block user on chat
- [x] Add link to Profile of current chat user
- [x] Resize event listner
- [x] Autocomplete off
- [] Blocked user chat rendering
- [] Invite to play game
- [] Add API request for chat

### Notifications
- [] Add dropdown

---------------------------------------------------------------------

## CSS
- [x] Add cursor for html: active and body:active
