# Nexus

> Discord is where your gaming friends hang out. **This is where your team gets work done.**

A self-hosted, open-source team communication platform built specifically for small agencies and teams.

## 🌟 Features

- 💬 **Real-time Messaging** - Channels, threads, DMs with full markdown support
- 🎥 **Voice & Video** - WebRTC-powered calls with screen sharing
- 🤖 **AI Agent** - Built-in AI assistant powered by Ollama (local, free, private)
- 🔍 **Superior Search** - PostgreSQL full-text search — find anything, instantly
- 📋 **Decision Log** - First-class log of every important decision
- 🔐 **Client Portal** - Scoped channel access for external clients
- 🏠 **Self-Hostable** - Run on your own infrastructure with Docker

## Why Nexus?

Discord is a consumer app being abused as a work tool. Nexus is a work tool from day one.

| Pain Point | Nexus Solution |
|-----------|-------------------|
| Discord search is terrible | PostgreSQL full-text search — find anything, instantly |
| Clients can't access your server safely | **Client Portal** — scoped channel access with invite tokens |
| Decisions get lost in chat | **Decision Log** — a first-class log of every important decision |
| AI bots cost money and need API keys | Built-in **AI Agent** powered by Ollama (local, free, private) |
| Discord's servers hold your data | **Self-hosted** — your server, your data, forever |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### One-Command Setup (Windows)

```bash
# Clone the repository
git clone https://github.com/atreyakamat/nexus
cd nexus

# Run the setup script
setup.bat

# Start development servers
start-dev.bat
```

### One-Command Setup (Linux/Mac)

```bash
# Clone the repository
git clone https://github.com/atreyakamat/nexus
cd nexus

# Install dependencies
pnpm install

# Start Docker services
docker compose up -d postgres redis minio

# Run database migrations
cd packages/db && pnpm db:push && cd ../..

# Start development servers
pnpm dev
```

### Manual Setup

```bash
# Build shared packages first
pnpm --filter @nexus/types build
pnpm --filter @nexus/db build

# Start each service individually
cd apps/api && pnpm dev        # API on http://localhost:3001
cd apps/gateway && pnpm dev    # Gateway on ws://localhost:3002
cd apps/web && pnpm dev        # Web on http://localhost:3000
```

### Using Docker Only

```bash
cp .env.example .env    # Edit JWT_SECRET and passwords
docker compose up -d
docker exec nexus-ollama-1 ollama pull llama3   # Optional: enable AI agent
open http://localhost:3000
```

## 📁 Project Structure

```
nexus/
├── apps/
│   ├── api/        # Fastify REST API (auth, channels, messages, search)
│   ├── gateway/    # WebSocket gateway (real-time via Redis pub/sub)
│   ├── agent/      # AI agent server (Ollama / self-hosted LLM)
│   └── web/        # Next.js frontend
├── packages/
│   ├── types/      # Shared TypeScript types
│   └── db/         # Drizzle ORM schema + PostgreSQL client
└── docker-compose.yml
```

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Backend** | Fastify + TypeScript |
| **Real-time** | WebSockets + Redis pub/sub |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **Search** | PostgreSQL full-text search |
| **AI** | Ollama (local LLM — llama3, mistral, etc.) |
| **File Storage** | MinIO (S3-compatible, self-hosted) |
| **Monorepo** | Turborepo + pnpm workspaces |

## 🛠️ Development

```bash
# Start all services
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Build for production
pnpm build

# Database operations
pnpm db:push     # Push schema to database
pnpm db:migrate  # Run migrations
pnpm db:studio   # Open Drizzle Studio
```

## 🔒 Security

- JWT authentication with bcrypt password hashing (cost factor 12)
- Rate limiting on all endpoints
- CORS protection
- XSS prevention via React
- CSRF protection
- Helmet security headers

## 📊 Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free | Self-hosted, unlimited users, core features |
| **Plus** | $8/user/mo | AI agent, client portals, priority support |
| **Pro** | $25/user/mo | SSO, advanced analytics, SLA |

## 📄 License

MIT — community edition is free forever. Self-host it, fork it, own your data.

---

**Nexus** - Built for teams, not for gamers.
