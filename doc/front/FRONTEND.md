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

three.js and cannon-es for 3D scenes.

### ✅ State & Routing

Custom client-side `router` and a singleton `socketManager` for WebSocket communications.

</br>

## SPA Application Flow

![SPA Application Flow](/assets/doc-front/SPA-runtime-flow.png)

</br>

## Docker Configuration

Two multistage Docker targets are defined.

**Production:**  
Installs dependencies, builds the app with `npm run build`, and outputs the static `dist/` directory for deployment.

**Development:**   
Installs dependencies and starts the Vite dev server (`npm run dev`) on port `5173`, exposed to `0.0.0.0` for container access.

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
├── package-lock.json        # Records exact versions of dependencies for consistent installs
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
- [Auth manager](./AUTH_MANAGER.md)
- [Component](./COMPONENT.md)
- [Router](./ROUTER.md)
- [Socket Manager](./SOCKET_MANAGER.md)
- [Tournament UI](./TOURNAMENT_UI.md)
