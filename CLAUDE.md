# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peacemakers Ponggers Edition is a real-time multiplayer PONG game built as a Single Page Application. The project combines authentication, live gameplay, chat, and 3D rendering using modern web technologies.

## Development Commands

### Docker/Container Commands (Primary)
- `make dev` - Start development environment with hot reload
- `make up` - Start containers in detached mode
- `make down` - Stop all containers
- `make build` - Build Docker images
- `make logs` - View logs from all services

### Backend Commands
- `make migrate` - Run Django migrations
- `make bash-backend` - Open bash shell in backend container
- `make populate-db` - Populate database with test data
- `make clean-db` - Flush database

### Frontend Commands
- `make bash-frontend` - Open shell in frontend container
- `make test-front` - Run frontend tests (Jest + Vitest)
- `make lint-front` - Run frontend linting

### Inside Frontend Container
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run test` - Run all tests (Jest + Vitest)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Inside Backend Container
- `python manage.py runserver` - Start Django development server
- `python manage.py test` - Run Django tests
- `ruff check` - Run Python linting (configured in pyproject.toml)

## Architecture

### Frontend Architecture
- **Framework**: Vanilla JavaScript with Vite build system
- **Styling**: Bootstrap 5 with custom CSS
- **3D Graphics**: Three.js for game rendering
- **Physics**: Cannon.js for game physics
- **Testing**: Jest (unit tests) + Vitest (integration tests)
- **Structure**: Component-based architecture using JavaScript modules

Key frontend directories:
- `front/app/src/js/components/` - Reusable UI components organized by feature
- `front/app/src/js/pages/` - Page-level components (login, game, chat, etc.)
- `front/app/src/js/sockets/` - WebSocket management for real-time features
- `front/app/src/js/api/` - API request utilities
- `front/app/src/js/auth/` - Authentication and JWT token management

### Backend Architecture
- **Framework**: Django with Django Ninja for API
- **WebSockets**: Django Channels with Redis for real-time communication
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: JWT tokens with OAuth2 support (GitHub, 42 School)
- **Background Tasks**: Crontab container for scheduled tasks

Django apps structure:
- `server/users/` - User management, authentication, profiles
- `server/chat/` - Chat system, notifications, game invitations
- `server/pong/` - Game logic, matchmaking, game rooms
- `server/tournaments/` - Tournament system and bracket management

### WebSocket Architecture
The application uses multiple WebSocket connections for real-time features:
- **Live Chat**: Direct messaging and notifications
- **Matchmaking**: Game matchmaking and room management
- **Tournament**: Tournament events and bracket updates
- **Game**: Real-time game state synchronization

## Key Configuration Files

- `docker-compose.yaml` - Multi-service container orchestration
- `front/app/vite.config.js` - Frontend build configuration with path aliases
- `server/server/settings.py` - Django settings with environment-based configuration
- `server/pyproject.toml` - Python linting configuration (Ruff)
- `front/app/package.json` - Frontend dependencies and scripts

## Testing

### Frontend Testing
- Run `make test-front` from project root or `npm run test` inside frontend container
- Jest for unit tests (`front/app/__tests__/jest/`)
- Vitest for integration tests (`front/app/__tests__/vitest/`)

### Backend Testing
- Run `python manage.py test` inside backend container
- Tests located in `tests/` directories within each Django app
- Uses Django's built-in testing framework

## Environment Setup

The project uses Docker for consistent development environments. Environment variables are managed through `.env` files. The application supports both development and production modes controlled by the `NODE_ENV` variable.

## OAuth Integration

The project supports OAuth2 authentication with GitHub and 42 School. OAuth configuration is centralized in Django settings with environment-specific credentials.