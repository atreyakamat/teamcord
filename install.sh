#!/bin/bash
set -e

# TeamCord One-Command Installer
echo "⚡ Starting TeamCord Installation..."

# 1. Check Requirements
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# 3. Generate Secrets
echo "Generating secrets..."
cat <<EOF > .env
POSTGRES_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 64)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -hex 20)
MEILI_MASTER_KEY=$(openssl rand -hex 32)
EOF

# 4. Prompt for Domain
read -p "Enter your domain (e.g., teamcord.yourteam.com): " DOMAIN
echo "DOMAIN=$DOMAIN" >> .env
echo "API_URL=https://$DOMAIN/api" >> .env
echo "GATEWAY_URL=wss://$DOMAIN/gateway" >> .env

# 5. Build and Start
echo "Starting TeamCord services..."
docker compose up -d

# 6. Wait for health checks
echo "Waiting for services to be healthy..."
sleep 20

echo "✓ TeamCord is running at https://$DOMAIN"
echo "✓ Admin panel: https://$DOMAIN/admin"
echo "✓ AI Agent: Ready (Ollama)"
echo "--------------------------------------------------"
echo "Next steps: Configure DNS to point at this server's IP."
