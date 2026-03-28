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
```

## Tech Stack

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
