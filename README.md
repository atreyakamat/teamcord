# TeamCord

> Discord is where your gaming friends hang out. **This is where your team gets work done.**

A self-hosted, open-source team communication platform built specifically for small agencies and teams.

## 📊 Project Status: 35-40% Complete (Alpha)

**Current State:** Core messaging and authentication working. Voice/video, AI agent, and file uploads are critical blockers for MVP.

**Estimated Time to MVP:** 8-12 weeks with 2-3 developers

📖 **Read these first:**
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Comprehensive feature status (30,000 words)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Quick overview and next steps
- [WHAT_TO_DO_NEXT.md](./WHAT_TO_DO_NEXT.md) - Your roadmap to MVP (START HERE)

## 🌟 Features

### ✅ Implemented (Working Now)
- ✅ **Real-time Messaging** - Channels, send/edit/delete messages with WebSocket updates
- ✅ **User Authentication** - JWT tokens, bcrypt hashing, rate limiting
- ✅ **Workspaces & Channels** - Create, manage, organize
- ✅ **Discord-inspired UI** - Full dark theme, three-panel layout
- ✅ **Infrastructure** - PostgreSQL, Redis, NATS, MinIO, Meilisearch, Ollama

### 🚧 In Progress (Critical for MVP)
- ❌ **Voice & Video** (0% - **BLOCKER**) - WebRTC calls and screen sharing
- ⚠️ **AI Agent** (15%) - @agent mentions, /summarise, /decide commands
- ❌ **File Upload** (0%) - File attachments and storage
- ⚠️ **Search** (5%) - Full-text search integration
- ⚠️ **Threads** (10%) - Threaded conversations
- ⚠️ **Reactions** (10%) - Emoji reactions

### 🔮 Planned Features
- 📋 **Decision Log** - AI-powered decision tracking
- 🏠 **Client Portal** - Scoped channel access for external clients
- 📝 **Channel Wiki** - Auto-generated documentation
- 🔍 **Semantic Search** - AI-powered search

## Why TeamCord vs Discord?

Discord is failing professional teams. TeamCord fixes every pain point.

| Pain Point | Discord | TeamCord |
|-----------|---------|----------|
| **Search** | Practically useless | PostgreSQL full-text search (when implemented) |
| **Privacy** | Tracks all apps, shares data | Self-hosted, zero telemetry |
| **Client Access** | Give full access or nothing | Client Portal (planned) |
| **AI Assistant** | None (or paid bots) | Built-in Ollama agent (in progress) |
| **Data Control** | Discord's servers | Your server, your data |
| **Knowledge Mgmt** | Lost in chat | Decision log & wiki (planned) |

## 🚀 Quick Start (Development)

**Note:** This is an alpha release. Many features are incomplete. See [WHAT_TO_DO_NEXT.md](./WHAT_TO_DO_NEXT.md) for the roadmap.

##

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### One-Command Setup (Windows)

```bash
# Clone the repository
git clone https://github.com/atreyakamat/teamcord
cd teamcord

# Run the setup script
setup.bat

# Start development servers
start-dev.bat
```

### One-Command Setup (Linux/Mac)

```bash
# Clone the repository
git clone https://github.com/atreyakamat/teamcord
cd teamcord

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
pnpm --filter @teamcord/types build
pnpm --filter @teamcord/db build

# Start each service individually
cd apps/api && pnpm dev        # API on http://localhost:3001
cd apps/gateway && pnpm dev    # Gateway on ws://localhost:3002
cd apps/web && pnpm dev        # Web on http://localhost:3000
```

### Using Docker Only

```bash
cp .env.example .env    # Edit JWT_SECRET and passwords
docker compose up -d
docker exec teamcord-ollama-1 ollama pull llama3   # Optional: enable AI agent
open http://localhost:3000
```

## 📁 Project Structure

```
teamcord/
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

**TeamCord** - Built for teams, not for gamers.
