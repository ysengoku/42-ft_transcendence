# Define the paths for volumes and backups
VOLUME_PATH := ./volumes
DATABASE_VOLUME_PATH := ./volumes/database
MEDIA_VOLUME_PATH := ./volumes/media
STATIC_VOLUME_PATH := ./volumes/static
BACKUP_DIR := ./backups
VOLUME_BACKUP_DIR := ./backups/volumes

# Define the Docker Compose files for development and production
DOCKER_COMPOSE = docker-compose.yaml

# Define the name of the services
FRONTEND_SERVICE = frontend
BACKEND_SERVICE = backend
DATABASE_SERVICE = database

# Default to production mode
NODE_ENV ?= development

# Ensure that the .env file exists
check-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi

# Create backup directories if they don't exist
create-backup-dirs:
	mkdir -p $(BACKUP_DIR)
	mkdir -p $(VOLUME_BACKUP_DIR)

# Backup volumes before shutdown
backup-volumes: create-backup-dirs
	@echo "Backing up volumes..."
	@docker run --rm \
		--volumes-from database \
		-v $(VOLUME_BACKUP_DIR):/backup \
		alpine \
		tar czf /backup/db_volume_$(shell date +%Y%m%d_%H%M%S).tar.gz /var/lib/postgresql/data
	@echo "Volumes backed up to $(VOLUME_BACKUP_DIR)"

# Build Docker images
build: check-env
	NODE_ENV=$(NODE_ENV) docker-compose -f $(DOCKER_COMPOSE) build

# Start containers with backup option
up: check-env
	NODE_ENV=$(NODE_ENV) docker-compose -f $(DOCKER_COMPOSE) up -d --build

# Development mode
dev: export NODE_ENV=development
dev: check-env
	$(MAKE) down
	NODE_ENV=development docker-compose -f $(DOCKER_COMPOSE) up --build

# Production mode
prod: export NODE_ENV=production
prod: check-env
	$(MAKE) down
	$(MAKE) up

# Stop containers with backup
down: backup-volumes
	docker-compose -f $(DOCKER_COMPOSE) down

# Restart containers
restart: down up

# Logs for each service
logs:
	@echo "Logs du conteneur $(FRONTEND_SERVICE):"
	@docker logs $(FRONTEND_SERVICE)
	@echo "--------------------"
	@echo "Logs du conteneur $(BACKEND_SERVICE):"
	@docker logs $(BACKEND_SERVICE)
	@echo "--------------------"
	@echo "Logs du conteneur $(DATABASE_SERVICE):"
	@docker logs $(DATABASE_SERVICE)

# Rebuild containers
rebuild: check-env
	docker-compose -f $(DOCKER_COMPOSE) up --build -d

# Run Django migrations
migrate:
	docker-compose exec $(BACKEND_SERVICE) python manage.py migrate

# Open a bash shell inside the backend container
bash-backend:
	docker-compose exec -it $(BACKEND_SERVICE) bash

# Open a bash shell inside the frontend container
bash-frontend:
	docker-compose exec -it $(FRONTEND_SERVICE) bash

# Restore volumes from the latest backup
restore-volumes:
	@latest_backup=$$(ls -t $(VOLUME_BACKUP_DIR)/db_volume_*.tar.gz | head -n1); \
	if [ -n "$$latest_backup" ]; then \
		echo "Restoring from $$latest_backup"; \
		docker run --rm \
			--volumes-from database \
			-v $(VOLUME_BACKUP_DIR):/backup \
			alpine \
			sh -c "cd / && tar xzf /backup/$$(basename $$latest_backup)"; \
		echo "Restore completed"; \
	else \
		echo "No backup found in $(VOLUME_BACKUP_DIR)"; \
	fi

# Ensure necessary directories exist
$(VOLUME_PATH):
	mkdir -p $(VOLUME_PATH)

$(DATABASE_VOLUME_PATH):
	mkdir -p $(DATABASE_VOLUME_PATH)

$(MEDIA_VOLUME_PATH):
	mkdir -p $(MEDIA_VOLUME_PATH)

$(STATIC_VOLUME_PATH):
	mkdir -p $(STATIC_VOLUME_PATH)
