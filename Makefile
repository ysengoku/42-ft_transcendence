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

# NODE_ENV is used to determine if the overall build is dev or prod (for the server and nginx containers too)
NODE_ENV = development

ensure-env:
	@if [ ! -f .env ]; then \
		echo ".env file not found, copying from .env.example"; \
		cp .env.example .env; \
	fi

update-ip:
	bash update_ip.sh

build: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) build

up: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) up --build

dev: ensure-env update-ip
	NODE_ENV=$(NODE_ENV) docker compose -f $(DOCKER_COMPOSE) --profile development up --build

prod: NODE_ENV=production
prod: up

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

populate-db:
	docker exec server ./manage.py populate_db

create-pending-tournament:
	docker exec server ./manage.py create_pending_tournament

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

# Run Django tests with statistics
tests:
	./test_with_stats.sh

# Run tests by module (fast with --keepdb)
tests-users:
	./test_with_stats.sh users

tests-chat:
	./test_with_stats.sh chat

tests-pong:
	./test_with_stats.sh pong

tests-tournaments:
	./test_with_stats.sh tournaments

# Run tests with fresh database (slower but clean)
tests-fresh:
	./test_with_stats.sh --fresh-db

tests-users-fresh:
	./test_with_stats.sh users --fresh-db

tests-chat-fresh:
	./test_with_stats.sh chat --fresh-db

tests-pong-fresh:
	./test_with_stats.sh pong --fresh-db

tests-tournaments-fresh:
	./test_with_stats.sh tournaments --fresh-db
.PHONY: bash-backend bash-frontend build clean-db delete-games delete-invites dev down ensure-env fclean lint-front logs migrate populate-db prod restart test-front up update-ip
