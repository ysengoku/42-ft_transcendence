# Frontend
Serves static assets (HTML, CSS, JavaScript).
Handles UI interactions and API calls to backend services.

ft_transcendence
├── front/
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   ├── app/
│   │   ├── index.html          # Single entry point for the SPA
│   │   ├── package.json
│   │   ├── vite.config.js
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
│   │   │   ├── main.js           # Main entry point for JavaScript
│   │   │   ├── router.js        # Manages client-side routing for SPA
│   │   │   ├── api/
│   │   │   │   ├── user.js        # API calls for user management
│   │   │   │   └── ...
│   │   │   ├── shared_components/          # Reusable UI components
│   │   │   │   ├── header.js       # Dynamic header logic
│   │   │   │   ├── footer.js       # Footer rendering logic
│   │   │   │   └── ...
│   │   │   ├── user/              # User-related components
│   │   │   │   ├── userProfile.js  # User profile component
│   │   │   │   ├── login.js
│   │   │   │   └── ...
│   │   │   ├── tournament/
│   │   │   │   └── ...
│   │   │   ├── .../
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── ...
│   │   │       └── ...
│   │   │
│   │   └── templates/
│   │       ├── header.html      # Optional: Fallback for header
│   │       ├── footer.html      # Static footer template
│   │       └── ...
│   └── doc/
│       ├── FRONT.md
│       └── ...
│
├── user-management/
├── game/ 
├── database/
