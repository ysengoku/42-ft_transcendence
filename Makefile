# Define the Docker Compose files for development and production
DOCKER_COMPOSE = docker-compose.yaml

# Define the name of the services (for convenience)
FRONTEND_SERVICE = front
BACKEND_SERVICE = back
DATABASE_SERVICE = database

# Define backup paths
BACKUP_DIR = ./backups
VOLUME_BACKUP_DIR = $(BACKUP_DIR)/volumes

# Ensure that the .env file exists before running docker-compose
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

# Build all Docker images
build: check-env $(VOLUME_PATH) $(DATABASE_VOLUME_PATH) $(MEDIA_VOLUME_PATH) $(STATIC_VOLUME_PATH)
	docker-compose -f $(DOCKER_COMPOSE) build

# Start with backup option
up: check-env
	docker-compose -f $(DOCKER_COMPOSE) up -d

# Stop containers with backup
down: backup-volumes
	docker-compose -f $(DOCKER_COMPOSE) down

# Rebuild the containers
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

# Restore volumes from latest backup
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

$(VOLUME_PATH):
	mkdir -p $(VOLUME_PATH)

$(DATABASE_VOLUME_PATH):
	mkdir -p $(DATABASE_VOLUME_PATH)

$(MEDIA_VOLUME_PATH):
	mkdir -p $(MEDIA_VOLUME_PATH)

$(STATIC_VOLUME_PATH):
	mkdir -p $(STATIC_VOLUME_PATH)