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

### Backend Testing Commands
- `make tests` - Run all Django tests with statistics
- `make tests-users` - Run user module tests only
- `make tests-chat` - Run chat module tests only  
- `make tests-pong` - Run game module tests only
- `make tests-tournaments` - Run tournament module tests only
- Add `-fresh` suffix (e.g., `make tests-chat-fresh`) to use fresh database (slower but clean)

### Frontend Testing
- Run `make test-front` from project root or `npm run test` inside frontend container
- `npm run test:jest` - Jest unit tests only
- `npm run test:vitest` - Vitest integration tests only
- Jest for unit tests (`front/app/__tests__/jest/`)
- Vitest for integration tests (`front/app/__tests__/vitest/`)

### Frontend Test Structure
**Unit Tests (Jest):**
- `isEqualFunction.test.js` - Tests deep equality utility function (18 test cases)
- `registerInputValidation.test.js` - Registration form validation tests

**Integration Tests (Vitest):**  
- `inputFeedback.test.js` - Comprehensive input validation testing
- `loginInputValidation.test.js` - Login form validation testing
- `tournamentInputValidation.test.js` - Tournament form validation testing

**Mock System (`front/app/__mock__/`):**
- Comprehensive API mocking (`mockLogin.js`, `mockRegister.js`, etc.)
- WebSocket mocking (`ws/mockTournamentWs.js`, `ws/setupMockWs.js`)
- Data mocking (chat, tournaments, users, notifications)
- Test assets (sample images for testing)

### Backend Test Structure
**Chat Module Tests (60 tests):**
- `test_chat.py` - Core chat functionality
- `test_chat_endpoints.py` - Chat API endpoints
- `test_events_consumers.py` - WebSocket event consumers
- `test_game_invitations.py` - Game invitation system
- `test_notifications_endpoints.py` - Notification API
- `test_security_chat_consumers.py` - Security tests for chat consumers

**Users Module Tests:**
- `test_auth_endpoints.py` - Authentication (login/logout/MFA/password reset)
- `test_mfa_endpoints.py` - Multi-factor authentication
- `test_oauth2_endpoints.py` - OAuth2 integration (GitHub, 42 School)
- `test_profile_model.py` - User profile models and game participation
- `test_users_endpoints.py` - User management APIs

**Pong Module Tests:**
- `test_game_room_model.py` - Game room management and player connections
- `test_game_stats_endpoints.py` - Game statistics, ELO ratings, match history

**Tournament Module Tests:**
- `test_tournament_endpoints.py` - Tournament API endpoints
- `test_tournaments_endpoints.py` - Tournament management, brackets, participants

### Test Statistics Script
The project includes `test_with_stats.sh` which provides detailed test statistics:
- Total tests run
- Pass/fail/error counts and percentages  
- Success rate calculation
- Status indicators (EXCELLENT/GOOD/NEEDS WORK)
- Supports both individual modules and full test suite

## Environment Setup

The project uses Docker for consistent development environments. Environment variables are managed through `.env` files. The application supports both development and production modes controlled by the `NODE_ENV` variable.

## OAuth Integration

The project supports OAuth2 authentication with GitHub and 42 School. OAuth configuration is centralized in Django settings with environment-specific credentials.