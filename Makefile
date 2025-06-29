VOLUME_PATH := ./volumes
DATABASE_VOLUME_PATH := $(VOLUME_PATH)/database
MEDIA_VOLUME_PATH := $(VOLUME_PATH)/media
STATIC_VOLUME_PATH := $(VOLUME_PATH)/static

# Couleurs
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
MAGENTA=\033[0;35m
BLUE=\033[0;34m
RESET=\033[0m

DOCKER_COMPOSE = docker-compose.yaml

FRONTEND_SERVICE = front
BACKEND_SERVICE = server
DATABASE_SERVICE = database
NGINX_SERVICE = nginx

NODE_ENV ?= development

ensure-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi

update-ip:
	./update_ip.sh

build: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) build

up: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) up -d --build

dev: export NODE_ENV=development
dev: ensure-env update-ip
	NODE_ENV=development docker compose -f $(DOCKER_COMPOSE) up --build

prod: export NODE_ENV=production
prod: ensure-env update-ip
	$(MAKE) up

down:
	docker compose -f $(DOCKER_COMPOSE) down

restart: down up

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

migrate:
	docker exec $(BACKEND_SERVICE) python ./manage.py makemigrations && docker exec $(BACKEND_SERVICE) python ./manage.py migrate

bash-backend:
	docker compose exec -it $(BACKEND_SERVICE) bash

bash-frontend:
	docker compose exec -it $(FRONTEND_SERVICE) sh

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

delete-invites:
	docker exec server ./manage.py delete_pending_invitations

delete-games:
	docker exec server ./manage.py delete_games

clean-db:
	docker exec server ./manage.py flush --no-input

test-front:
	docker exec $(FRONTEND_SERVICE) npm run test

lint-front:
	docker exec $(FRONTEND_SERVICE) npm run lint
