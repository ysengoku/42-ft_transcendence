# Define the paths for volumes and backups
VOLUME_PATH := ./volumes
DATABASE_VOLUME_PATH := ./volumes/database
MEDIA_VOLUME_PATH := ./volumes/media
STATIC_VOLUME_PATH := ./volumes/static

# Couleurs
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
MAGENTA=\033[0;35m
BLUE=\033[0;34m
RESET=\033[0m

# Define backup directories for each volume type
# BACKUP_DIR := ./backups
# DB_BACKUP_DIR := $(BACKUP_DIR)/database
# MEDIA_BACKUP_DIR := $(BACKUP_DIR)/media
# STATIC_BACKUP_DIR := $(BACKUP_DIR)/static

# Define the Docker Compose files for development and production
DOCKER_COMPOSE = docker-compose.yaml

# Define the name of the services
FRONTEND_SERVICE = front
BACKEND_SERVICE = server
DATABASE_SERVICE = database
NGINX_SERVICE = nginx

# Default to production mode
NODE_ENV ?= development

# Create all necessary backup directories
# create-backup-dirs:
# 	mkdir -p $(DB_BACKUP_DIR)
# 	mkdir -p $(MEDIA_BACKUP_DIR)
# 	mkdir -p $(STATIC_BACKUP_DIR)

# Ensure that the .env file exists
check-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi


# Build Docker images
build: check-env
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) build

# Start containers with backup option
up: check-env #  ensure-volumes
#	$(MAKE) backup-volumes
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) up -d --build

# Development mode
dev: export NODE_ENV=development
dev: check-env # ensure-volumes
#	$(MAKE) backup-volumes
	NODE_ENV=development docker compose -f $(DOCKER_COMPOSE) up --build

# Production mode
prod: export NODE_ENV=production
prod: check-env # ensure-volumes
#	$(MAKE) backup-volumes
	$(MAKE) up

# Stop containers with backup
down:
#	$(MAKE) backup-volumes
	docker compose -f $(DOCKER_COMPOSE) down

# Restart containers
restart: down up

# Logs for each service
# Logs for each service
logs:
	@printf "${MAGENTA}--------------------${RESET}\n"
	docker ps -a
	@printf "${MAGENTA}--------------------${RESET}\n"
	@printf "${YELLOW}$(FRONTEND_SERVICE) logs:${RESET}\n"
	@docker logs $(FRONTEND_SERVICE)
	@printf "${YELLOW}--------------------${RESET}\n"
	@printf "${GREEN}$(BACKEND_SERVICE) logs:${RESET}\n"
	@docker logs $(BACKEND_SERVICE)
	@printf "${GREEN}--------------------${RESET}\n"

	@printf "${RED}$(DATABASE_SERVICE) logs:${RESET}\n"
	@docker logs $(DATABASE_SERVICE)
	@printf "${RED}--------------------${RESET}\n"

	@printf "${BLUE}$(NGINX_SERVICE) logs:${RESET}\n"
	@docker logs $(NGINX_SERVICE)
	@printf "${BLUE}--------------------${RESET}\n"


# Rebuild containers
rebuild: check-env
	docker compose -f $(DOCKER_COMPOSE) up --build -d

# Run Django migrations
migrate:
	docker exec $(BACKEND_SERVICE) python ./manage.py makemigrations && docker exec $(BACKEND_SERVICE) python ./manage.py migrate

# Open a bash shell inside the backend container
bash-backend:
	docker compose exec -it $(BACKEND_SERVICE) bash

# Open a bash shell inside the frontend container
bash-frontend:
	docker compose exec -it $(FRONTEND_SERVICE) bash

fclean:
	docker compose down --volumes
	docker system prune -a
	docker volume prune -a

# RUN WITH MAKE -i
update-nginx:
	docker cp ./nginx/nginx.conf nginx:/etc/nginx/
	docker exec nginx nginx -s reload

populate-db:
	docker exec server ./manage.py populate_db

clean-db:
	docker exec server ./manage.py flush --no-input
