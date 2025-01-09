# Frontend
Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

ft_transcendence
├── front/
│   ├── app/
│   │   ├── index.html          # Single entry point for the SPA
│   │   │
│   │   ├── assets/
│   │   │   ├── images/         # Static images (logos, icons, etc.)
│   │   │   ├── fonts/
│   │   │   └── favicon.ico
│   │   │
│   │   ├── css/
│   │   │   ├── style.css       # Main stylesheet
│   │   │   └── components/
│   │   │       ├── header.css
│   │   │       ├── footer.css
│   │   │       └── ...
│   │   │
│   │   ├── js/
│   │   │   ├── main.js          # Main entry point for JavaScript
│   │   │   ├── Router.js        # Manages client-side routing for SPA
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── navbar/
│   │   │   │   │   ├── DropdownMenu.js
│   │   │   │   │   └── ...
│   │   │   │   │── pages/
│   │   │   │   │   ├── Landing.js
│   │   │   │   │   ├── Login.js
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── .../
│   │   │   │       ├── ...
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── api/
│   │   │       ├── ...
│   │   │       └── ...
│   │   │
│   │   │── package.json
│   │   └── vite.config.js
│   │
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   └── doc/
│       ├── FRONT.md
│       └── ...
│
├── user-management/
├── game/ 
├── database/
