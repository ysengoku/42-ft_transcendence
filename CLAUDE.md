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
- `make restart` - Restart all containers (down + up)
- `make fclean` - Clean all containers, volumes, and images

### Backend Commands
- `make migrate` - Run Django migrations
- `make bash-backend` - Open bash shell in backend container
- `make populate-db` - Populate database with test data
- `make clean-db` - Flush database
- `make delete-invites` - Delete pending game invitations
- `make delete-games` - Delete game data

### Frontend Commands
- `make bash-frontend` - Open shell in frontend container
- `make test-front` - Run frontend tests (Jest + Vitest)
- `make lint-front` - Run frontend linting

### Inside Frontend Container
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run test` - Run all tests (Jest + Vitest)
- `npm run test:jest` - Run Jest unit tests only
- `npm run test:vitest` - Run Vitest integration tests only
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Inside Backend Container
- `python manage.py runserver` - Start Django development server
- `python manage.py test` - Run Django tests
- `ruff check` - Run Python linting (configured in pyproject.toml)

## Architecture

### Frontend Architecture
- **Framework**: Vanilla JavaScript with Vite 6.0.5 build system
- **Styling**: Bootstrap 5.3.3 with custom CSS and Bootstrap Icons
- **3D Graphics**: Three.js 0.172.0 for game rendering with orbit controls
- **Physics**: Cannon.js for game physics simulation
- **Testing**: Jest 29.7.0 (unit tests) + Vitest 1.6.1 (integration tests)
- **Structure**: Component-based architecture using ES6 modules
- **Linting**: ESLint 9.27.0 with Google config and Prettier integration

Key frontend directories:
- `front/app/src/js/components/` - Reusable UI components organized by feature
- `front/app/src/js/pages/` - Page-level components (login, game, chat, etc.)
- `front/app/src/js/sockets/` - WebSocket management for real-time features
- `front/app/src/js/api/` - API request utilities
- `front/app/src/js/auth/` - Authentication and JWT token management
- `front/app/src/js/utils/` - Utility functions and helpers

### Backend Architecture
- **Framework**: Django 5.1.4 with Django Ninja 1.3.0 for API
- **WebSockets**: Django Channels 4.0.0 with Redis 5.0.1 for real-time communication
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: JWT tokens with OAuth2 support (GitHub, 42 School)
- **Background Tasks**: Crontab container for scheduled tasks
- **Linting**: Ruff configured in pyproject.toml with comprehensive rules
- **Image Processing**: Pillow 11.1.0 for avatar/media handling

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

- `docker-compose.yaml` - Multi-service container orchestration (frontend, backend, database, nginx, redis, crontab)
- `Makefile` - Development commands and shortcuts
- `front/app/vite.config.js` - Frontend build configuration with path aliases
- `front/app/package.json` - Frontend dependencies and scripts
- `front/app/jest.config.js` - Jest unit testing configuration
- `front/app/vitest.config.js` - Vitest integration testing configuration
- `front/app/eslint.config.js` - ESLint configuration
- `server/server/settings.py` - Django settings with environment-based configuration
- `server/pyproject.toml` - Python linting configuration (Ruff)
- `server/requirements.txt` - Python dependencies
- `test_with_stats.sh` - Enhanced test runner with statistics

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
**Unit Tests (Jest) - `front/app/__tests__/jest/`:**
- `isEqualFunction.test.js` - Tests deep equality utility function

**Integration Tests (Vitest) - `front/app/__tests__/vitest/`:**  
- `inputFeedback.test.js` - Comprehensive input validation testing
- `loginInputValidation.test.js` - Login form validation testing
- `tournamentInputValidation.test.js` - Tournament form validation testing
- `avatarUploadFileValidation.test.js` - Avatar upload validation testing
- `validateGameOptionsInLocalStorage.test.js` - Game options validation testing

**Mock System (`front/app/__mock__/`):**
- Comprehensive API mocking (`mockLogin.js`, `mockRegister.js`, etc.)
- WebSocket mocking (`ws/mockTournamentWs.js`, `ws/setupMockWs.js`)
- Data mocking (chat, tournaments, users, notifications)
- Test assets (sample images for testing)
- File type mocking (`fileMock.js`, `styleMock.js`, `svgMock.js`)

### Backend Test Structure
**Chat Module Tests (`server/chat/tests/`):**
- `test_chat.py` - Core chat functionality
- `test_chat_endpoints.py` - Chat API endpoints
- `test_events_consumers.py` - WebSocket event consumers
- `test_game_invitations.py` - Game invitation system
- `test_notifications_endpoints.py` - Notification API
- `test_security_chat_consumers.py` - Security tests for chat consumers

**Users Module Tests (`server/users/tests/`):**
- `test_auth_endpoints.py` - Authentication (login/logout/MFA/password reset)
- `test_mfa_endpoints.py` - Multi-factor authentication
- `test_oauth2_endpoints.py` - OAuth2 integration (GitHub, 42 School)
- `test_profile_model.py` - User profile models and game participation
- `test_users_endpoints.py` - User management APIs

**Pong Module Tests (`server/pong/tests/`):**
- `test_game_room_model.py` - Game room management and player connections
- `test_game_stats_endpoints.py` - Game statistics, ELO ratings, match history

**Tournament Module Tests (`server/tournaments/tests/`):**
- `test_tournament_endpoints.py` - Tournament API endpoints
- `test_tournaments_endpoints.py` - Tournament management, brackets, participants

### Test Statistics Script
The project includes `test_with_stats.sh` which provides detailed test statistics:
- Total tests run
- Pass/fail/error counts and percentages  
- Success rate calculation
- Status indicators (EXCELLENT/GOOD/NEEDS WORK)
- Supports both individual modules and full test suite
- Simplified logic without artificial delays
- Clean output parsing for better reliability

## Environment Setup

The project uses Docker for consistent development environments. Environment variables are managed through `.env` files. The application supports both development and production modes controlled by the `NODE_ENV` variable.

## OAuth Integration

The project supports OAuth2 authentication with GitHub and 42 School. OAuth configuration is centralized in Django settings with environment-specific credentials.