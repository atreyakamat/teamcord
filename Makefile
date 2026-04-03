# TeamCord Development Makefile

.PHONY: setup dev stop clean ps logs migrate shell-db

# Setup environment
setup:
	cp .env.example .env
	docker compose pull
	@echo "✓ Setup complete. Edit .env and run 'make dev'."

# Start all services in development mode
dev:
	docker compose up --build

# Start only infrastructure services
infra:
	docker compose up -d postgres redis nats meilisearch minio keycloak ollama searxng prometheus grafana loki

# Stop all services
stop:
	docker compose down

# Deep clean: stop services and remove volumes
clean:
	docker compose down -v
	@echo "✓ All data wiped."

# Check service status
ps:
	docker compose ps

# View service logs
logs:
	docker compose logs -f

# Run database migrations (will be implemented in Phase 1B)
migrate:
	@echo "Running migrations..."
	# TODO: Add migration command once messaging service is ready

# Open PostgreSQL shell
shell-db:
	docker exec -it teamcord-postgres psql -U teamcord -d teamcord
