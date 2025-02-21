# Frontend

Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

## Directory structure

front/
├─ app/
│  ├─ index.html
│  ├─ src/
│  │  ├─ css/
│  │  │  └─ style.css
│  │  ├─ js/
│  │  │  ├─ api/
│  │  │  │  ├─ apiRequest.js
│  │  │  │  ├─ endpoints.js
│  │  │  │  └─ index.js
│  │  │  ├─ auth/
│  │  │  │  ├─ authManager.js
│  │  │  │  ├─ csrfToken.js
│  │  │  │  ├─ handleLogout.js
│  │  │  │  ├─ index.js
│  │  │  │  └─ refreshToken.js
│  │  │  ├─ components/
│  │  │  │  ├─ navbar/
│  │  │  │  │  ├─ Navbar.js
│  │  │  │  │  ├─ components/
│  │  │  │  │  │  ├─ ChatButton.js
│  │  │  │  │  │  ├─ DropdownMenu.js
│  │  │  │  │  │  ├─ FriendsButton.js
│  │  │  │  │  │  ├─ FriendsList.js
│  │  │  │  │  │  ├─ NavbarBrand.js
│  │  │  │  │  │  ├─ NotificationsButton.js
│  │  │  │  │  │  ├─ UserActionsMenu.js
│  │  │  │  │  │  ├─ UserListItem.js
│  │  │  │  │  │  ├─ UserSearch.js
│  │  │  │  │  │  └─ UserSearchButton.js
│  │  │  │  │  └─ index.js
│  │  │  │  └─ pages/
│  │  │  │     ├─ Landing.js
│  │  │  │     ├─ NotFound.js
│  │  │  │     ├─ ResetPassword.js
│  │  │  │     ├─ chat/
│  │  │  │     │  ├─ Chat.js
│  │  │  │     │  └─ components/
│  │  │  │     │     ├─ ChatList.js
│  │  │  │     │     ├─ ChatListItem.js
│  │  │  │     │     ├─ ChatMessageArea.js
│  │  │  │     │     ├─ ChatMessageInput.js
│  │  │  │     │     └─ index.js
│  │  │  │     ├─ dual/
│  │  │  │     │  ├─ Dual.js
│  │  │  │     │  └─ DualMenu.js
│  │  │  │     ├─ home/
│  │  │  │     │  ├─ Home.js
│  │  │  │     │  └─ components/
│  │  │  │     │     ├─ DualButton.js
│  │  │  │     │     ├─ LogoutButton.js
│  │  │  │     │     ├─ ProfileButton.js
│  │  │  │     │     ├─ SettingsButton.js
│  │  │  │     │     ├─ TournamentButton.js
│  │  │  │     │     └─ index.js
│  │  │  │     ├─ index.js
│  │  │  │     ├─ login/
│  │  │  │     │  ├─ Login.js
│  │  │  │     │  └─ components/
│  │  │  │     │     ├─ LoginForm.js
│  │  │  │     │     ├─ OAuth.js
│  │  │  │     │     └─ index.js
│  │  │  │     ├─ profile/
│  │  │  │     │  ├─ Profile.js
│  │  │  │     │  ├─ UserNotFound.js
│  │  │  │     │  └─ components/
│  │  │  │     │     ├─ Avatar.js
│  │  │  │     │     ├─ DuelHistory.js
│  │  │  │     │     ├─ Enemy.js
│  │  │  │     │     ├─ GameHistory.js
│  │  │  │     │     ├─ OnlineStatusIndicator.js
│  │  │  │     │     ├─ StatCard.js
│  │  │  │     │     ├─ TournamentHistory.js
│  │  │  │     │     ├─ UserActions.js
│  │  │  │     │     ├─ UserInfo.js
│  │  │  │     │     ├─ WinRatePieGraph.js
│  │  │  │     │     └─ index.js
│  │  │  │     ├─ register/
│  │  │  │     │  └─ Register.js
│  │  │  │     ├─ settings/
│  │  │  │     │  ├─ Settings.js
│  │  │  │     │  ├─ components/
│  │  │  │     │  │  ├─ AvatarUpload.js
│  │  │  │     │  │  ├─ AvatarUploadModal.js
│  │  │  │     │  │  ├─ DeleteAccountButton.js
│  │  │  │     │  │  ├─ EmailUpdate.js
│  │  │  │     │  │  ├─ MfaEnableUpdate.js
│  │  │  │     │  │  ├─ PasswordUpdate.js
│  │  │  │     │  │  ├─ UserIdentityUpdate.js
│  │  │  │     │  │  └─ index.js
│  │  │  │     │  └─ index.js
│  │  │  │     └─ tournament/
│  │  │  │        ├─ Tournament.js
│  │  │  │        └─ TournamentMenu.js
│  │  │  ├─ router.js
│  │  │  ├─ socket.js
│  │  │  └─ utils/
│  │  │     ├─ ThemeController.js
│  │  │     ├─ alertMessage.js
│  │  │     ├─ errorMessage.js
│  │  │     ├─ index.js
│  │  │     ├─ inputFeedback.js
│  │  │     └─ viewPort.js
│  │  └─ main.js
│  │
│  ├─ public/
│  │  └─ img/
│  │ 
│  ├─ __tests__/
│  ├─ .eslintrc.json
│  ├─ .gitignore
│  ├─ .prettierrc
│  ├─ babel.config.cjs
│  ├─ jest.config.js
│  ├─ package-lock.json
│  ├─ package.json
│  └─ vite.config.js
└─ Dockerfile


## Unit tests

```bash
# From app directory
npm test
```
