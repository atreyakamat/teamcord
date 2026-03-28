<<<<<<< HEAD
# Nexus - Team Communication Platform

> The Discord alternative built for professional teams. Open-source, self-hostable, AI-native.

## Features

- 💬 **Real-time Messaging** - Channels, threads, DMs with full markdown support
- 🎥 **Voice & Video** - WebRTC-powered calls with screen sharing
- 🤖 **AI Agent** - Built-in AI assistant for summarization, decisions, and more
- 🏠 **Self-Hostable** - Run on your own infrastructure with Docker
- 🔒 **Privacy-First** - Zero telemetry, full data ownership

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/nexus.git
cd nexus

# Run setup script (Windows)
setup.bat

# Or manually create directories and install:
pnpm install

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Using Docker

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

## Project Structure

```
nexus/
├── apps/
│   ├── web/          # React PWA frontend
│   └── api/          # Node.js backend
├── packages/
│   ├── shared/       # Shared types & utilities
│   └── ui/           # Shared UI components
└── docker/           # Docker configurations
=======
# TeamCord

> Discord is where your gaming friends hang out. **This is where your team gets work done.**

A self-hosted, open-source team communication platform built specifically for small agencies and teams.

## Why TeamCord?

Discord is a consumer app being abused as a work tool. TeamCord is a work tool from day one.

| Pain Point | TeamCord Solution |
|-----------|-------------------|
| Discord search is terrible | PostgreSQL full-text search — find anything, instantly |
| Clients can't access your server safely | **Client Portal** — scoped channel access with invite tokens |
| Decisions get lost in chat | **Decision Log** — a first-class log of every important decision |
| AI bots cost money and need API keys | Built-in **AI Agent** powered by [Ollama](https://ollama.ai) (local, free, private) |
| Discord's servers hold your data | **Self-hosted** — your server, your data, forever |

## Quick Start (Self-Hosted)

```bash
git clone https://github.com/atreyakamat/teamcord
cd teamcord
cp .env.example .env          # Edit JWT_SECRET and passwords
docker compose up -d
docker exec teamcord-ollama-1 ollama pull llama3   # optional: enable AI agent
open http://localhost:3000
```

## Architecture

See [docs/architecture.md](./docs/architecture.md) for the full technical architecture including system diagrams, real-time message flow, and AI agent design.

```
apps/
  api/        Fastify REST API (auth, channels, messages, search, decisions)
  gateway/    WebSocket gateway (real-time via Redis pub/sub)
  agent/      AI agent server (Ollama / self-hosted LLM)
  web/        Next.js 15 frontend

packages/
  types/      Shared TypeScript types
  db/         Drizzle ORM schema + PostgreSQL client
>>>>>>> fe8b75e35d81b8dc3a23304251ae8c388484bbad
```

## Tech Stack

<<<<<<< HEAD
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.IO, Redis |
| Voice/Video | mediasoup (WebRTC) |
| Search | Meilisearch |
| AI | OpenAI / Claude API |

## Scripts

```bash
pnpm dev        # Start all in dev mode
pnpm dev:web    # Start frontend only
pnpm dev:api    # Start backend only
pnpm build      # Build for production
pnpm test       # Run tests
pnpm lint       # Run linter
```

## License

MIT License

---

**Nexus** - Built for teams, not for gamers.
=======
- **API**: Fastify + TypeScript
- **Real-time**: WebSockets + Redis pub/sub
- **Database**: PostgreSQL 16 + Drizzle ORM
- **AI**: Ollama (local LLM — llama3, mistral, etc.)
- **Frontend**: Next.js 15 + React 19
- **File storage**: MinIO (S3-compatible, self-hosted)
- **Monorepo**: Turborepo + pnpm

## License

MIT — community edition is free forever. Self-host it, fork it, own your data.
>>>>>>> fe8b75e35d81b8dc3a23304251ae8c388484bbad
