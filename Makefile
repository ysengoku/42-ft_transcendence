# Define the Docker Compose files for development and production
DOCKER_COMPOSE = docker-compose.yaml

# Define the name of the services (for convenience)
FRONTEND_SERVICE = front
BACKEND_SERVICE = back
DATABASE_SERVICE = db

# Définit le mode par défaut (prod)
NODE_ENV ?= production

# Ensure that the .env file exists before running docker-compose
check-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi

# Build all Docker images
build: check-env $(VOLUME_PATH) $(DATABASE_VOLUME_PATH) $(MEDIA_VOLUME_PATH) $(STATIC_VOLUME_PATH)
	NODE_ENV=$(NODE_ENV) docker-compose -f $(DOCKER_COMPOSE) build

up: check-env
	NODE_ENV=$(NODE_ENV) docker-compose -f $(DOCKER_COMPOSE) up -d --build

# Start containers in development mode with logs
dev: export NODE_ENV=development
dev: check-env
	$(MAKE) down
	NODE_ENV=development docker-compose -f $(DOCKER_COMPOSE) up --build

# Start containers in production mode
prod: export NODE_ENV=production
prod: check-env
	$(MAKE) down
	$(MAKE) up

# Stop all containers
down:
	docker-compose -f $(DOCKER_COMPOSE) down

# Restart containers
restart: down up

logs:
	docker-compose -f $(DOCKER_COMPOSE) logs -f


# Rebuild the containers (useful when dependencies or code change)
rebuild: check-env
	docker-compose -f $(DOCKER_COMPOSE) up --build -d

# Run migrations for the backend (Django)
migrate:
	docker-compose exec $(BACKEND_SERVICE) python manage.py migrate

# Open a bash shell inside the backend container
bash-backend:
	docker-compose exec $(BACKEND_SERVICE) bash

# Open a bash shell inside the frontend container
bash-frontend:
	docker-compose exec $(FRONTEND_SERVICE) bash

$(VOLUME_PATH):
	mkdir -p $(VOLUME_PATH)

$(DATABASE_VOLUME_PATH):
	mkdir -p $(DATABASE_VOLUME_PATH)

$(MEDIA_VOLUME_PATH):
	mkdir -p $(MEDIA_VOLUME_PATH)

$(STATIC_VOLUME_PATH):
	mkdir -p $(STATIC_VOLUME_PATH)