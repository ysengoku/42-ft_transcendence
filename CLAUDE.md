# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## Project Overview

ft_transcendence is a 42 School project implementing a real-time multiplayer Pong game with tournament system, chat, and user management. The application uses a containerized architecture with Django backend, vanilla JavaScript frontend, PostgreSQL database, Redis for WebSocket support, and Nginx as reverse proxy.

## Development Commands

### Container Management
```bash
# Start development environment
make up

# Start with logs visible
make dev

# Stop containers
make down

# View logs from all services
make logs

# Rebuild containers
make rebuild

# Clean shutdown with volume cleanup
make fclean
```

### Backend Commands
```bash
# Django migrations
make migrate

# Access Django shell
make bash-backend

# Populate database with test data
make populate-db

# Django management commands
docker exec server ./manage.py <command>

# Clean database
make clean-db
```

### Frontend Commands
```bash
# Access frontend container
make bash-frontend

# Run frontend tests
make test-front

# Run frontend linter
make lint-front

# Inside frontend container:
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run all tests
npm run test:jest    # Jest tests only
npm run test:vitest  # Vitest tests only
npm run lint         # ESLint
```

### Database Maintenance
```bash
# Delete pending game invitations
make delete_invites

# Delete game records
make delete_games
```

## Architecture Overview

### Backend (Django)
- **Framework**: Django 5.1.4 with Django Ninja for API
- **Database**: PostgreSQL with psycopg2 adapter
- **WebSockets**: Django Channels with Redis backend
- **Authentication**: Custom JWT implementation with refresh tokens
- **Apps Structure**:
  - `users/` - User management, authentication, OAuth (GitHub, 42)
  - `chat/` - Real-time messaging and game invitations
  - `pong/` - Game logic, matchmaking, statistics
  - `tournaments/` - Tournament bracket system and management
  - `common/` - Shared utilities and schemas

### Frontend (Vanilla JavaScript)
- **Framework**: Custom Web Components architecture
- **Build Tool**: Vite 6.0.5 with path aliases
- **Styling**: Bootstrap 5.3.3
- **3D Graphics**: Three.js with Cannon-es physics
- **Testing**: Dual setup with Jest and Vitest
- **Architecture**:
  - Component-based with Custom Elements
  - Client-side routing with history API
  - Centralized API communication with token refresh
  - Multi-socket system for real-time features
  - Session-based state management

### Infrastructure
- **Container Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx with SSL termination
- **Cache/Sessions**: Redis for Django Channels
- **Cron Jobs**: Separate container for scheduled tasks
- **Volumes**: Persistent storage for database, media, and static files

## Key Development Patterns

### Backend Patterns
- **API Design**: Django Ninja with Pydantic schemas for request/response validation
- **Authentication**: Middleware-based with custom User model
- **WebSocket Consumers**: Separate consumers for chat, matchmaking, and tournaments
- **Database**: Django ORM with migrations for schema management
- **Testing**: Django's TestCase with WebSocket testing utilities

### Frontend Patterns
- **Component Structure**: Each component extends HTMLElement with consistent lifecycle
- **State Management**: Local component state with session storage for auth
- **API Communication**: Centralized request handler with automatic token refresh
- **Real-time**: WebSocket managers for different feature domains
- **Routing**: Dynamic route registration with parameter support

### WebSocket Architecture
- **Game Worker**: Separate process for game logic execution
- **Chat System**: Real-time messaging with history persistence
- **Tournament System**: Bracket progression with real-time updates
- **Matchmaking**: Queue-based system with skill-based matching

## Configuration Files

### Environment Variables
- Main configuration in `.env` (copied from `.env.example`)
- Django settings in `server/server/settings.py`
- Frontend environment in `front/app/src/js/env.js`

### Docker Configuration
- `docker-compose.yaml` - Main orchestration file
- Service-specific Dockerfiles in each directory
- Development/production mode switching via `NODE_ENV`

### Database
- PostgreSQL in container environment
- SQLite for local development (when `IN_CONTAINER=false`)
- Migrations managed through Django

## Testing

### Backend Testing
```bash
# Run Django tests
docker exec server python manage.py test

# Run specific app tests
docker exec server python manage.py test users
```

### Frontend Testing
```bash
# Run all frontend tests
make test-front

# Inside frontend container:
npm run test:jest    # Unit tests
npm run test:vitest  # Integration tests
```

### Testing Structure
- **Backend**: Django TestCase with WebSocket testing
- **Frontend**: Dual Jest/Vitest setup with comprehensive mocking
- **Mocks**: Extensive mock system for API, WebSocket, and file operations

## Security Considerations

- JWT tokens with refresh mechanism
- CSRF protection for API endpoints
- Input validation using Pydantic schemas
- OAuth integration (GitHub, 42 School)
- Multi-factor authentication support
- Secure file upload handling

## Performance Optimization

- Redis caching for session management
- WebSocket connection pooling
- Static file serving through Nginx
- Database query optimization
- Frontend asset bundling with Vite

## Monitoring and Debugging

- Django Silk for SQL query profiling
- Colored logging configuration
- Container health checks
- Development error reporting
- WebSocket connection monitoring