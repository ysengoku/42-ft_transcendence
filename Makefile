# Define the Docker Compose files for development and production
DEV_DOCKER_COMPOSE = docker-compose.dev.yaml
PROD_DOCKER_COMPOSE = docker-compose.prod.yaml

# Define the name of the services (for convenience)
FRONTEND_SERVICE = js-front
BACKEND_SERVICE = django-back-end
DATABASE_SERVICE = postgres

# Build all Docker images
build:
	docker-compose -f $(DEV_DOCKER_COMPOSE) build
	docker-compose -f $(PROD_DOCKER_COMPOSE) build

# Start the development containers (bind mounts for volumes)
up:
	docker-compose -f $(DEV_DOCKER_COMPOSE) up -d

# Start the production containers
up-prod:
	docker-compose -f $(PROD_DOCKER_COMPOSE) up -d

# Stop all containers
down:
	docker-compose down

# Rebuild the containers (useful when dependencies or code change)
rebuild:
	docker-compose -f $(DEV_DOCKER_COMPOSE) up --build -d
	docker-compose -f $(PROD_DOCKER_COMPOSE) up --build -d

# Run migrations for the backend (Django)
migrate:
	docker-compose exec $(BACKEND_SERVICE) python manage.py migrate

# Open a bash shell inside the backend container
bash-backend:
	docker-compose exec $(BACKEND_SERVICE) bash

# Open a bash shell inside the frontend container
bash-frontend:
	docker-compose exec $(FRONTEND_SERVICE) bash

# Build the production image with inotify-tools for automatic rebuilds
build-prod:
	docker build -f ./production/Dockerfile -t transcendance-prod .

# Run the production containers with automatic rebuild (via inotify)
prod-reload:
	docker-compose -f $(PROD_DOCKER_COMPOSE) up -d --build
