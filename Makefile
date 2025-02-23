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

# backup-volumes: create-backup-dirs
# 	@echo "Starting unified backup of all volumes..."
# 	@echo "Backing up database volume..."
# 	@if docker container inspect $(DATABASE_SERVICE) >/dev/null 2>&1; then \
# 		docker run --rm \
# 			--volumes-from $(DATABASE_SERVICE) \
# 			-v $(DB_BACKUP_DIR):/backup \
# 			alpine \
# 			tar czf /backup/db_volume_$(shell date +%Y%m%d_%H%M%S).tar.gz /var/lib/postgresql/data && \
# 		echo "✓ Database volume backed up to $(DB_BACKUP_DIR)"; \
# 	else \
# 		echo "⚠️ Warning: $(DATABASE_SERVICE) container not found, skipping database backup"; \
# 	fi
# 	@echo "Backing up media volume..."
# 	@if docker container inspect $(BACKEND_SERVICE) >/dev/null 2>&1; then \
# 		docker run --rm \
# 			--volumes-from $(BACKEND_SERVICE) \
# 			-v $(MEDIA_BACKUP_DIR):/backup \
# 			alpine \
# 			tar czf /backup/media_volume_$(shell date +%Y%m%d_%H%M%S).tar.gz /app/media && \
# 		echo "✓ Media volume backed up to $(MEDIA_BACKUP_DIR)"; \
# 	else \
# 		echo "⚠️ Warning: $(BACKEND_SERVICE) container not found, skipping media backup"; \
# 	fi
# 	@echo "Backing up static volume..."
# 	@if docker container inspect $(BACKEND_SERVICE) >/dev/null 2>&1; then \
# 		docker run --rm \
# 			--volumes-from $(BACKEND_SERVICE) \
# 			-v $(STATIC_BACKUP_DIR):/backup \
# 			alpine \
# 			tar czf /backup/static_volume_$(shell date +%Y%m%d_%H%M%S).tar.gz /app/static && \
# 		echo "✓ Static volume backed up to $(STATIC_BACKUP_DIR)"; \
# 	else \
# 		echo "⚠️ Warning: $(BACKEND_SERVICE) container not found, skipping static backup"; \
# 	fi
# 	@echo "✓ All volume backups completed"

# Unified restore command for all volumes
# restore-volumes:
# 	@echo "Starting unified restore of all volumes..."
# 	@echo "Restoring database volume..."
# 	@latest_db_backup=$$(ls -t $(DB_BACKUP_DIR)/db_volume_*.tar.gz 2>/dev/null | head -n1); \
# 	if [ -n "$$latest_db_backup" ]; then \
# 		docker run --rm \
# 			--volumes-from $(DATABASE_SERVICE) \
# 			-v $(DB_BACKUP_DIR):/backup \
# 			alpine \
# 			sh -c "cd / && tar xzf /backup/$$(basename $$latest_db_backup)" && \
# 		echo "✓ Database volume restored from $$latest_db_backup"; \
# 	else \
# 		echo "⚠️ No database backup found in $(DB_BACKUP_DIR)"; \
# 	fi
# 	@echo "Restoring media volume..."
# 	@latest_media_backup=$$(ls -t $(MEDIA_BACKUP_DIR)/media_volume_*.tar.gz 2>/dev/null | head -n1); \
# 	if [ -n "$$latest_media_backup" ]; then \
# 		docker run --rm \
# 			--volumes-from $(BACKEND_SERVICE) \
# 			-v $(MEDIA_BACKUP_DIR):/backup \
# 			alpine \
# 			sh -c "cd / && tar xzf /backup/$$(basename $$latest_media_backup)" && \
# 		echo "✓ Media volume restored from $$latest_media_backup"; \
# 	else \
# 		echo "⚠️ No media backup found in $(MEDIA_BACKUP_DIR)"; \
# 	fi
# 	@echo "Restoring static volume..."
# 	@latest_static_backup=$$(ls -t $(STATIC_BACKUP_DIR)/static_volume_*.tar.gz 2>/dev/null | head -n1); \
# 	if [ -n "$$latest_static_backup" ]; then \
# 		docker run --rm \
# 			--volumes-from $(BACKEND_SERVICE) \
# 			-v $(STATIC_BACKUP_DIR):/backup \
# 			alpine \
# 			sh -c "cd / && tar xzf /backup/$$(basename $$latest_static_backup)" && \
# 		echo "✓ Static volume restored from $$latest_static_backup"; \
# 	else \
# 		echo "⚠️ No static backup found in $(STATIC_BACKUP_DIR)"; \
# 	fi
# 	@echo "✓ All volume restores completed"

# Ensure volumes exist
# ensure-volumes:
# 	mkdir -p $(DATABASE_VOLUME_PATH)
# 	mkdir -p $(MEDIA_VOLUME_PATH)
# 	mkdir -p $(STATIC_VOLUME_PATH)
