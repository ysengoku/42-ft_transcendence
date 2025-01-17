# Frontend structure
Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

ft_transcendence
├── front/
│   ├── app/
│   │   ├── index.html          # Single entry point for the SPA
│   │   │
│   │   ├── assets/
│   │   │   ├── img/         
│   │   │   │   ├── header.css
│   │   │   │   ├── footer.css
│   │   │   │   └── ...
│   │   │   │   
│   │   │   └── static/  
│   │   │       └── img         # Static images (logos, icons, etc.)
│   │   │           ├── logo
│   │   │           ├── default_avatar
│   │   │           ├── favicon.ico
│   │   │           └── ...
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
│   │   │   │   │   ├── Navbar.js
│   │   │   │   │   └── ...
│   │   │   │   │── pages/
│   │   │   │   │   ├── Landing.js
│   │   │   │   │   ├── Login.js
│   │   │   │   │   └── ...
│   │   │   │   │── modals/
│   │   │   │   │   ├── chat/
│   │   │   │   │   └── friends/
│   │   │   │   │
│   │   │   │   └── .../
│   │   │   │       ├── ...
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── 
│   │   │   │   ├── 
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── utils/
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
