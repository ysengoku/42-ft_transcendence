# Frontend

Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

## Directory structure

front/
├── app
│   ├── index.html
│   ├── src
│   │   └── main.js
│   │   ├── css
│   │   │   └── style.css
│   │   ├── js
│   │   │   ├── api
│   │   │   │   ├── apiRequest.js
│   │   │   │   ├── endpoints.js
│   │   │   │   └── index.js
│   │   │   ├── components
│   │   │   │   ├── modals
│   │   │   │   │   ├── friends
│   │   │   │   │   │   ├── FriendSearch.js
│   │   │   │   │   │   ├── FriendsListItem.js
│   │   │   │   │   │   └── FriendsListModal.js
│   │   │   │   │   └── index.js
│   │   │   │   ├── navbar
│   │   │   │   │   ├── Navbar.js
│   │   │   │   │   ├── components/
│   │   │   │   │   └── index.js
│   │   │   │   └── pages
│   │   │   │       ├── index.js
│   │   │   │       ├── Landing.js
│   │   │   │       ├── home
│   │   │   │       │   ├── Home.js
│   │   │   │       │   └── components/
│   │   │   │       ├── login
│   │   │   │       │   ├── Login.js
│   │   │   │       │   └── components/
│   │   │   │       ├── profile
│   │   │   │       │   ├── Profile.js
│   │   │   │       │   ├── UserNotFound.js
│   │   │   │       │   └── components/
│   │   │   │       ├── register
│   │   │   │       │   └── Register.js
│   │   │   │       ├── settings
│   │   │   │       │   ├── Settings.js
│   │   │   │       │   ├── components/
│   │   │   │       │   └── index.js
│   │   │   │       ├── chat
│   │   │   │       │   └── Chat.js
│   │   │   │       ├── dual
│   │   │   │       │   ├── Dual.js
│   │   │   │       │   └── DualMenu.js
│   │   │   │       |── tournament/
│   │   │   │       |   ├── Tournament.js
│   │   │   │       |   └── TournamentMenu.js
│   │   │   │       ├── NotFound.js
│   │   │   │       └── ResetPassword.js
│   |   │   |
│   │   │   ├── router.js
│   │   │   |── utils
│   │   │   |   ├── ThemeController.js
│   │   │   |   └── handleLogout.js
│   │   │   └── mock
│   │   │
│   |   └── public
│   |       |── img/
│   │       └── fonts/
|   |
│   ├── __tests__
│   ├── babel.config.cjs
│   ├── jest.config.js
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
|
├── Dockerfile
└── doc

## Unit tests

```bash
# From app directory
npm test
```
