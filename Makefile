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

NODE_ENV = development

.PHONY: ensure-env
ensure-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi

.PHONY: update-ip
update-ip:
	./update_ip.sh

.PHONY: build
build: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) build

.PHONY: up
up: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) up --build

.PHONY: dev
dev: export NODE_ENV=development
dev:
	$(MAKE) up

.PHONY: prod
prod: export NODE_ENV=production
prod:
	$(MAKE) up

.PHONY: down
down:
	docker compose -f $(DOCKER_COMPOSE) down

.PHONY: restart
restart: down up

.PHONY: logs
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

.PHONY: migrate
migrate:
	docker exec $(BACKEND_SERVICE) python ./manage.py makemigrations && docker exec $(BACKEND_SERVICE) python ./manage.py migrate

.PHONY: bash-backend
bash-backend:
	docker compose exec -it $(BACKEND_SERVICE) bash

.PHONY: bash-frontend
bash-frontend:
	docker compose exec -it $(FRONTEND_SERVICE) sh

.PHONY: fclean
fclean:
	docker compose down --volumes
	docker system prune -a
	docker volume prune -a

.PHONY: populate-db
populate-db:
	docker exec server ./manage.py populate_db

.PHONY: delete-invites
delete-invites:
	docker exec server ./manage.py delete_pending_invitations

.PHONY: delete-games
delete-games:
	docker exec server ./manage.py delete_games

.PHONY: clean-db
clean-db:
	docker exec server ./manage.py flush --no-input

.PHONY: test-front
test-front:
	docker exec $(FRONTEND_SERVICE) npm run test

.PHONY: lint-front
lint-front:
	docker exec $(FRONTEND_SERVICE) npm run lint
