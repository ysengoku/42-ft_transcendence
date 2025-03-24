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
- [x] Delete modal

### User search
- [x] Add user search button and dropdown to Navbar
- [x] User search function
- [x] Adjust style for search bar

### Notification
-[x] Add dropdown
- [] Rendering of notifications received via Websocket
- [] Fetch old notifications

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
- [x] Forgot password
- [x] Mfa handling
- [x] Resend Mfa error handling
- [x] Style mfa code form

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
- [x] Email format check
- [x] Incorrect old password case (401 occurs infinite loop with current logic)
- [x] Test Delete account & add adieu message
- [] Unit test (input validation)
- [x] Disable submit button if there is no change

---------------------------------------------------------------------

## Profile

- [x] Add auth check before rendering
- [x] Layout for Mobile

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
- [] Badge design

### Game History
- [x] Better solution for Scroll thead sticky
- [x]  Tournament history table

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
- [x] Add API request for chat
- [] Blocked user chat rendering
- [] Invite to play game
- [x] Create new chat room
- [] Handle scroll up to see old messages

### Online status
Update online status in real time
- [] Chat page
- [] Profile
- [] Friends list?
- [] User search list?

---------------------------------------------------------------------

## CSS
- [x] Add cursor for html: active and body:active

---------------------------------------------------------------------

## Add sanitize html | Refactor

### navbar
- [x] - [x] Navbar.js
- [x] - [x] ChatButton.js
- [x] - [x] DropdownMenu.js
- [x] - [x] FriendsButton.js
- [x] - [x] FriendsList.js
- [x] - [x] NavbarBrand.js
- [x] - [x] NotificationsButton.js
- [x] - [x] UserActionsMenu.js
- [x] - [x] UserListItem.js
- [x] - [x] UserSearch.js
- [x] - [x] UserSearchButton.js

### pages
- [x] - [x] Landing.js
- [x] - [x] Error.js
- [x] - [x] NotFound.js

#### chat
- [x] - [x] Chat.js
- [x] - [x] ChatList.js
- [x] - [x] ChatListItem.js
- [x] - [] ChatMessageArea.js (TODO: Remove message like event listeners)
- [x] - [x] ChatMessageInput.js

#### home
- [x] - [x] Home.js

#### login
- [x] - [x] Login.js
- [x] - [x] LoginForm.js
- [x] - [x] OAuth.js
- [x] - [x] ForgotPassword.js
- [x] - [x] ResetPassword.js
- [x] - [x] MfaVerification.js

#### profile
- [x] - [x] Profile.js
- [x] - [x] UserNotFound.js
- [x] - [x] Avatar.js
- [x] - [x] DuelHistory.js
- [x] - [x] Enemy.js
- [x] - [x] GameHistory.js
- [x] - [x] OnlineStatusIndicator.js
- [x] - [x] StatCard.js
- [x] - [x] TournamentHistory.js
- [x] - [x] UserActions.js
- [x] - [x] UserInfo.js
- [x] - [x] WinRatePieGraph.js

#### register
- [x] - [x] Register.js

#### settings
- [x] - [x] Settings.js
- [x] - [x] AvatarUpload.js
- [x] - [x] AvatarUploadModal.js
- [x] - [x] DeleteAccountButton.js
- [x] - [x] DeleteAccountConfirmationModal.js
- [x] - [x] EmailUpdate.js
- [x] - [x] MfaEnableUpdate.js
- [x] - [x] PasswordUpdate.js
- [x] - [x] UserIdentityUpdate.js

#### utils
- [x] alertMessage.js
- [x] formFeedback.js
- [x] inputFeedback.js
 