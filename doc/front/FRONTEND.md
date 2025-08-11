# Front-End Overview

This document summarizes the front-end setup and structure of the project.

## Front-End Stack

### ✅ Build Tool & Dev Server

**Development**:   
Vite serves ES modules over a fast local server with Hot Module Replacement (HMR), so that code changes appear instantly without a full reload.  

**Production**:  
Vite bundles and optimizes the code via Rollup, automatically applying tree‑shaking, code splitting, and asset hashing for lean, high‑performance builds.

### ✅ Language

ES modules (native JavaScript import/export).

### ✅ UI Tools

Bootstrap v5.3 and Bootstrap Icons

### ✅ 3D & Visualization

- **Three.js** and **cannon-es** for interactive 3D scenes and physics.
- **Custom SVG-based Data Visualization Chat** for real-time data rendering without third-party chart libraries.

### ✅ State & Routing

Custom client-side `router` and a singleton `socketManager` for WebSocket communications.

</br>

## SPA (Single Page Application) Flow

The frontend operates entirely as a single-page application.  
Routing, state management, and view rendering are all handled client-side, with the backend providing only API and WebSocket endpoints.

![SPA Flow](/assets/doc-front/SPA-runtime-flow.png)

</br>

## Docker Setup for Frontend Development & Deployment

The frontend can run in **development** mode using a Node container, or be **built for production** and served by the shared Nginx proxy.

### Development

- **Base image:** `node:22-alpine`
- **Process:** Installs dependencies and starts the Vite dev server (`npm run dev`) on port `5173`, exposed to `0.0.0.0` for container access.
- **Volume mount:** `./front/app/src:/app/src` so code changes take effect immediately without rebuilding

### Production

- **Build stage:**  
  - Uses `node:22-alpine` to install dependencies and run `npm run build`  
  - Outputs the static `dist/` directory

- **Runtime stage:**  
  - The static `dist/` files are copied into the **Nginx container**.  
  - This Nginx container is the main entry point for the entire application. It serves the frontend at `/` and also proxies API requests to the backend.

</br>

## Package Scripts

The `app/package.json` defines these key scripts:

| Script        | Command                                    | Purpose                            |
| ------------- | ------------------------------------------ | ---------------------------------- |
| `dev`         | `vite --host 0.0.0.0`                      | Start development server with HMR  |
| `build`       | `vite build`                               | Produce production-ready assets    |
| `preview`     | `vite preview`                             | Serve the production build locally |
| `lint`        | `eslint .`                                 | Static code analysis               |
| `format`      | `prettier --check "**/*.{js,jsx}"`         | Enforce code style                 |
| `test`        | `vitest run`                               | Run unit tests                     |

</br>

## Directory Structure

```
app/
├── index.html   
├── public/                  # Static assets (images, fonts, 3D models, filters)
├── src/
│   ├── css/style.css
│   ├── main.js              # Application entry point
│   └── js/
│       ├── components/      # Custom HTML elements used in the UI
│       │   ├── navbar/        # Navbar components
│       │   └── pages/         # Page-level components
│       ├── router.js        # Client-side routing logic
│       ├── sockets/         # WebSocket manager and handlers
│       ├── api/             # Handles HTTP requests to the backend
│       ├── auth/            # Manages authentication-related logic
│       └── utils/           # General-purpose helper functions
├── vite.config.js           # Vite configuration
├── Dockerfile 
├── package.json             # NPM scripts and dependencies
├── package-lock.json        # Exact versions of dependencies for consistent installs
└── __tests__/               # Vitest test files
```

</br>

## Build & Deployment

**Local Development:**   
- `npm install` → `npm run dev`
- Dev server listens on `0.0.0.0:5173` for HMR.

**Production Build:**   
- `npm run build` generates `dist/`, ready for static hosting.

### About Vite

Vite is a modern build tool that focuses on speed and simplicity. It offers the following benefits:

- **Instant startup**: Uses native ES modules to avoid bundling during development.
- **Hot Module Replacement (HMR)**: Updates modules in the browser instantly on save.
- **Optimized production builds**: Delegates to Rollup to generate fast, minimized bundles.
- **Out-of-the-box support**: Works seamlessly with modern JavaScript and many libraries.

Vite handles both the development server and the production build process, minimizing configuration and improving efficiency.

</br>

## Testing

- **Unit Tests**: Vitest covers router logic, socket manager, and utility functions under `__tests__/`.
- **Coverage Goal**: All critical modules (routing, sockets, utilities) and utility functions are unit-tested.

</br>

## Detailed documentations

- [API Request](./API_REQUEST.md)
- [Auth Manager](./AUTH_MANAGER.md)
- [Component](./COMPONENT.md)
- [Router](./ROUTER.md)
- [Socket Manager](./SOCKET_MANAGER.md)
- [Data visualization](./DATA_VISUALIZATION.md)
