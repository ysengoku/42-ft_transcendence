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
│  │  │  │     ├─ index.js
│  │  │  │     ├─ Landing.js
│  │  │  │     ├─ NotFound.js
│  │  │  │     ├─ Error.js
│  │  │  │     ├─ chat/
│  │  │  │     │  ├─ Chat.js
│  │  │  │     │  └─ components/
│  │  │  │     ├─ home/
│  │  │  │     │  ├─ Home.js
│  │  │  │     │  └─ components/
│  │  │  │     ├─ login/
│  │  │  │     │  ├─ Login.js
│  │  │  │     │  ├─ MfaVerification.js
│  │  │  │     │  ├─ ForgotPassword.js
│  │  │  │     │  ├─ RecoverPassword.js
│  │  │  │     │  └─ components/
│  │  │  │     ├─ profile/
│  │  │  │     │  ├─ Profile.js
│  │  │  │     │  ├─ UserNotFound.js
│  │  │  │     │  └─ components/
│  │  │  │     ├─ register/
│  │  │  │     │  └─ Register.js
│  │  │  │     ├─ settings/
│  │  │  │     │  ├─ Settings.js
│  │  │  │     │  └─ components/
│  │  │  │     ├─ duel/
│  │  │  │     │  ├─ Duel.js
│  │  │  │     │  └─ DuelMenu.js
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
