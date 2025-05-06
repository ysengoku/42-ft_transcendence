# Frontend

Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

## Directory structure outline
```
front/
├─ app/
│  ├─ index.html
│  ├─ src/
│  │  ├─ css/
│  │  │  └─ style.css
│  │  ├─ js/
│  │  │  ├─ router.js
│  │  │  ├─ socket.js
│  │  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  │
│  │  │  ├─ components/
│  │  │  │  ├─ navbar/
│  │  │  │  └─ pages/
│  │  │  │
│  │  │  └─ utils/
│  │  └─ main.js
│  │
│  ├─ public/
│  │  ├─ img/
│  │  ├─ fonts/
│  │  ├─ 3d_models/
│  │  ├─ filters/
│  │  └─ audio/
│  │ 
│  ├─ __tests__/
│  ├─ .eslintrc.json
│  ├─ babel.config.cjs
│  ├─ jest.config.js
│  ├─ package.json
│  └─ vite.config.js
└─ Dockerfile
```

## Unit tests

```bash
# From app directory
npm test
```
