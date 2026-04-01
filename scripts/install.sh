#!/usr/bin/env bash
#
# TeamCord Installation Script
# One-command deployment for self-hosted TeamCord
#
# Usage: curl -fsSL https://raw.githubusercontent.com/teamcord/teamcord/main/scripts/install.sh | bash
#

set -e

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Config ────────────────────────────────────────────────────────────────────
TEAMCORD_VERSION="${TEAMCORD_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/teamcord}"
MIN_DOCKER_VERSION="20.10.0"
MIN_COMPOSE_VERSION="2.0.0"
MIN_RAM_GB=4
MIN_DISK_GB=20

# ─── Helper Functions ──────────────────────────────────────────────────────────

print_banner() {
  echo -e "${BLUE}"
  echo '████████╗███████╗ █████╗ ███╗   ███╗ ██████╗ ██████╗ ██████╗ ██████╗ '
  echo '╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝██╔═══██╗██╔══██╗██╔══██╗'
  echo '   ██║   █████╗  ███████║██╔████╔██║██║     ██║   ██║██████╔╝██║  ██║'
  echo '   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██║     ██║   ██║██╔══██╗██║  ██║'
  echo '   ██║   ███████╗██║  ██║██║ ╚═╝ ██║╚██████╗╚██████╔╝██║  ██║██████╔╝'
  echo '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ '
  echo -e "${NC}"
  echo "Team Communication Platform - Self-Hosted Installation"
  echo ""
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    return 1
  fi
  return 0
}

version_gte() {
  # Compare version strings
  printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

generate_secret() {
  # Generate a secure random string
  openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
}

# ─── System Checks ─────────────────────────────────────────────────────────────

check_system() {
  log_info "Checking system requirements..."
  
  # Check OS
  OS=$(uname -s)
  if [[ "$OS" != "Linux" && "$OS" != "Darwin" ]]; then
    log_error "Unsupported operating system: $OS"
    log_error "TeamCord requires Linux or macOS"
    exit 1
  fi
  
  # Check RAM
  if [[ "$OS" == "Linux" ]]; then
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_GB=$((RAM_KB / 1024 / 1024))
  else
    RAM_GB=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
  fi
  
  if [[ $RAM_GB -lt $MIN_RAM_GB ]]; then
    log_warn "System has ${RAM_GB}GB RAM. Recommended: ${MIN_RAM_GB}GB+"
  else
    log_info "RAM: ${RAM_GB}GB ✓"
  fi
  
  # Check disk space
  if [[ "$OS" == "Linux" ]]; then
    DISK_GB=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
  else
    DISK_GB=$(df -g / | tail -1 | awk '{print $4}')
  fi
  
  if [[ $DISK_GB -lt $MIN_DISK_GB ]]; then
    log_warn "Available disk space: ${DISK_GB}GB. Recommended: ${MIN_DISK_GB}GB+"
  else
    log_info "Disk space: ${DISK_GB}GB ✓"
  fi
}

check_docker() {
  log_info "Checking Docker..."
  
  if ! check_command docker; then
    log_error "Docker is not installed"
    log_info "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
  fi
  
  DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0.0.0")
  if ! version_gte "$DOCKER_VERSION" "$MIN_DOCKER_VERSION"; then
    log_warn "Docker version $DOCKER_VERSION found. Recommended: $MIN_DOCKER_VERSION+"
  else
    log_info "Docker version: $DOCKER_VERSION ✓"
  fi
  
  # Check Docker daemon
  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    log_info "Start Docker and try again"
    exit 1
  fi
}

check_docker_compose() {
  log_info "Checking Docker Compose..."
  
  # Check for docker compose plugin first
  if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "0.0.0")
  elif check_command docker-compose; then
    COMPOSE_CMD="docker-compose"
    COMPOSE_VERSION=$(docker-compose version --short 2>/dev/null || echo "0.0.0")
  else
    log_error "Docker Compose is not installed"
    log_info "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
  fi
  
  log_info "Docker Compose version: $COMPOSE_VERSION ✓"
}

# ─── Installation ──────────────────────────────────────────────────────────────

get_user_input() {
  log_info "Configuration setup..."
  echo ""
  
  # Domain
  read -p "Enter your domain (e.g., teamcord.example.com) [localhost]: " DOMAIN
  DOMAIN=${DOMAIN:-localhost}
  
  # Email for Let's Encrypt (skip if localhost)
  if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
    read -p "Enter email for SSL certificates: " ADMIN_EMAIL
    if [[ -z "$ADMIN_EMAIL" ]]; then
      log_error "Email is required for SSL certificates"
      exit 1
    fi
    USE_SSL=true
  else
    ADMIN_EMAIL=""
    USE_SSL=false
    log_info "SSL disabled for localhost"
  fi
  
  # SMTP (optional)
  echo ""
  read -p "Configure email notifications? (y/N): " SETUP_SMTP
  if [[ "$SETUP_SMTP" =~ ^[Yy]$ ]]; then
    read -p "SMTP host: " SMTP_HOST
    read -p "SMTP port [587]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP username: " SMTP_USER
    read -sp "SMTP password: " SMTP_PASS
    echo ""
    read -p "SMTP from address: " SMTP_FROM
  fi
  
  # AI Provider
  echo ""
  log_info "AI Agent Configuration"
  echo "1) Ollama (local, free, community edition)"
  echo "2) Anthropic Claude API (Plus/Pro)"
  echo "3) OpenAI API"
  read -p "Select AI provider [1]: " AI_CHOICE
  AI_CHOICE=${AI_CHOICE:-1}
  
  case $AI_CHOICE in
    2)
      AI_PROVIDER="anthropic"
      read -sp "Enter Anthropic API key: " ANTHROPIC_API_KEY
      echo ""
      ;;
    3)
      AI_PROVIDER="openai"
      read -sp "Enter OpenAI API key: " OPENAI_API_KEY
      echo ""
      ;;
    *)
      AI_PROVIDER="ollama"
      log_info "Using Ollama (will be installed automatically)"
      ;;
  esac
  
  echo ""
}

create_env_file() {
  log_info "Generating configuration..."
  
  # Generate secrets
  JWT_SECRET=$(generate_secret)
  DB_PASSWORD=$(generate_secret | cut -c1-32)
  REDIS_PASSWORD=$(generate_secret | cut -c1-32)
  MINIO_SECRET=$(generate_secret | cut -c1-32)
  
  cat > "$INSTALL_DIR/.env" << EOF
# TeamCord Configuration
# Generated: $(date)

# ─── Domain & URLs ─────────────────────────────────────────────────────────────
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
USE_SSL=$USE_SSL

# Public URLs (used by clients)
PUBLIC_URL=${USE_SSL:+https}${USE_SSL:-http}://$DOMAIN
WS_URL=${USE_SSL:+wss}${USE_SSL:-ws}://$DOMAIN/gateway

# ─── Secrets (KEEP THESE SECURE!) ──────────────────────────────────────────────
JWT_SECRET=$JWT_SECRET
DATABASE_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ROOT_PASSWORD=$MINIO_SECRET

# ─── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgres://teamcord:${DB_PASSWORD}@postgres:5432/teamcord
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ─── Object Storage ────────────────────────────────────────────────────────────
MINIO_ROOT_USER=teamcord
MINIO_ENDPOINT=minio:9000
S3_BUCKET=teamcord-files

# ─── AI Agent ──────────────────────────────────────────────────────────────────
AI_PROVIDER=$AI_PROVIDER
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
${ANTHROPIC_API_KEY:+ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY}
${OPENAI_API_KEY:+OPENAI_API_KEY=$OPENAI_API_KEY}

# ─── SMTP (Email) ──────────────────────────────────────────────────────────────
${SMTP_HOST:+SMTP_HOST=$SMTP_HOST}
${SMTP_PORT:+SMTP_PORT=$SMTP_PORT}
${SMTP_USER:+SMTP_USER=$SMTP_USER}
${SMTP_PASS:+SMTP_PASS=$SMTP_PASS}
${SMTP_FROM:+SMTP_FROM=$SMTP_FROM}

# ─── NATS Messaging ────────────────────────────────────────────────────────────
NATS_URL=nats://nats:4222

# ─── Search ────────────────────────────────────────────────────────────────────
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_KEY=$(generate_secret | cut -c1-32)

# ─── Service Ports (internal) ──────────────────────────────────────────────────
API_PORT=3001
GATEWAY_PORT=3002
WEB_PORT=3000
VOICE_PORT=3004
AI_AGENT_PORT=3005

# ─── Node Environment ──────────────────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=info
EOF

  chmod 600 "$INSTALL_DIR/.env"
  log_success "Configuration saved to $INSTALL_DIR/.env"
}

download_files() {
  log_info "Downloading TeamCord..."
  
  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  
  # Download docker-compose.yml
  if [[ "$TEAMCORD_VERSION" == "latest" ]]; then
    curl -fsSL "https://raw.githubusercontent.com/teamcord/teamcord/main/docker-compose.yml" -o docker-compose.yml
    curl -fsSL "https://raw.githubusercontent.com/teamcord/teamcord/main/docker-compose.prod.yml" -o docker-compose.prod.yml
  else
    curl -fsSL "https://raw.githubusercontent.com/teamcord/teamcord/v${TEAMCORD_VERSION}/docker-compose.yml" -o docker-compose.yml
    curl -fsSL "https://raw.githubusercontent.com/teamcord/teamcord/v${TEAMCORD_VERSION}/docker-compose.prod.yml" -o docker-compose.prod.yml
  fi
  
  # Create Caddyfile for reverse proxy
  if [[ "$USE_SSL" == "true" ]]; then
    cat > Caddyfile << EOF
$DOMAIN {
  # API
  handle /api/* {
    reverse_proxy api:3001
  }
  
  # WebSocket Gateway
  handle /gateway {
    reverse_proxy gateway:3002
  }
  
  # Voice WebSocket
  handle /voice {
    reverse_proxy voice:3004
  }
  
  # Web frontend
  handle {
    reverse_proxy web:3000
  }
  
  # TLS configuration
  tls $ADMIN_EMAIL
}
EOF
  else
    cat > Caddyfile << EOF
:80 {
  # API
  handle /api/* {
    reverse_proxy api:3001
  }
  
  # WebSocket Gateway
  handle /gateway {
    reverse_proxy gateway:3002
  }
  
  # Voice WebSocket  
  handle /voice {
    reverse_proxy voice:3004
  }
  
  # Web frontend
  handle {
    reverse_proxy web:3000
  }
}
EOF
  fi
  
  log_success "Files downloaded"
}

create_data_dirs() {
  log_info "Creating data directories..."
  
  mkdir -p "$INSTALL_DIR/data/postgres"
  mkdir -p "$INSTALL_DIR/data/redis"
  mkdir -p "$INSTALL_DIR/data/minio"
  mkdir -p "$INSTALL_DIR/data/meilisearch"
  mkdir -p "$INSTALL_DIR/data/ollama"
  mkdir -p "$INSTALL_DIR/data/nats"
  mkdir -p "$INSTALL_DIR/data/caddy"
  mkdir -p "$INSTALL_DIR/logs"
  
  log_success "Data directories created"
}

start_services() {
  log_info "Starting TeamCord services..."
  
  cd "$INSTALL_DIR"
  
  # Pull images
  $COMPOSE_CMD pull
  
  # Start services
  $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up -d
  
  log_info "Waiting for services to start..."
  sleep 10
  
  # Check if services are running
  if ! $COMPOSE_CMD ps --services --filter "status=running" | grep -q "api"; then
    log_error "API service failed to start"
    $COMPOSE_CMD logs api
    exit 1
  fi
  
  log_success "All services started"
}

run_migrations() {
  log_info "Running database migrations..."
  
  cd "$INSTALL_DIR"
  $COMPOSE_CMD exec -T api npm run db:migrate
  
  log_success "Database migrations complete"
}

print_success() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  TeamCord installed successfully!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  if [[ "$USE_SSL" == "true" ]]; then
    echo -e "  ${BLUE}URL:${NC}       https://$DOMAIN"
  else
    echo -e "  ${BLUE}URL:${NC}       http://$DOMAIN"
  fi
  echo ""
  echo -e "  ${BLUE}Directory:${NC} $INSTALL_DIR"
  echo -e "  ${BLUE}Logs:${NC}      $COMPOSE_CMD logs -f"
  echo -e "  ${BLUE}Stop:${NC}      $COMPOSE_CMD down"
  echo -e "  ${BLUE}Restart:${NC}   $COMPOSE_CMD restart"
  echo ""
  
  if [[ "$AI_PROVIDER" == "ollama" ]]; then
    echo -e "  ${YELLOW}Note:${NC} Ollama will download the AI model on first use (~4GB)"
    echo ""
  fi
  
  echo "  Create your first account at the URL above."
  echo "  The first user will automatically become an admin."
  echo ""
}

# ─── Uninstall ─────────────────────────────────────────────────────────────────

uninstall() {
  log_warn "This will remove TeamCord and ALL data"
  read -p "Are you sure? Type 'yes' to confirm: " CONFIRM
  
  if [[ "$CONFIRM" != "yes" ]]; then
    log_info "Uninstall cancelled"
    exit 0
  fi
  
  cd "$INSTALL_DIR" 2>/dev/null || true
  
  # Stop services
  if [[ -f docker-compose.yml ]]; then
    $COMPOSE_CMD down -v --remove-orphans
  fi
  
  # Remove directory
  rm -rf "$INSTALL_DIR"
  
  log_success "TeamCord has been uninstalled"
}

# ─── Update ────────────────────────────────────────────────────────────────────

update() {
  log_info "Updating TeamCord..."
  
  cd "$INSTALL_DIR"
  
  # Backup env file
  cp .env .env.backup
  
  # Pull new images
  $COMPOSE_CMD pull
  
  # Restart with new images
  $COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up -d
  
  # Run migrations
  run_migrations
  
  log_success "TeamCord updated successfully"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
  print_banner
  
  # Parse arguments
  case "${1:-}" in
    --uninstall)
      check_docker
      check_docker_compose
      uninstall
      exit 0
      ;;
    --update)
      check_docker
      check_docker_compose
      update
      exit 0
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --uninstall    Remove TeamCord and all data"
      echo "  --update       Update to the latest version"
      echo "  --help         Show this help message"
      echo ""
      echo "Environment variables:"
      echo "  TEAMCORD_VERSION    Version to install (default: latest)"
      echo "  INSTALL_DIR         Installation directory (default: \$HOME/teamcord)"
      exit 0
      ;;
  esac
  
  # Run installation
  check_system
  check_docker
  check_docker_compose
  
  echo ""
  get_user_input
  
  download_files
  create_data_dirs
  create_env_file
  start_services
  run_migrations
  
  print_success
}

main "$@"
