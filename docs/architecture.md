# TeamCord — Technical Architecture

> "Discord is where your gaming friends hang out. This is where your team gets work done."

## Overview

TeamCord is a self-hosted, open-source team communication platform built specifically for small agencies and teams. It addresses the core pain points of using Discord for work: poor search, no client access control, knowledge lost in chat threads, and data privacy concerns.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │          Next.js 15 Web App  (apps/web)                         │   │
│  │  • Server-side rendering + React client components              │   │
│  │  • Zustand for global state  •  SWR for data fetching           │   │
│  │  • WebSocket hook for real-time events                          │   │
│  └────────────┬─────────────────────┬───────────────┬─────────────┘   │
│               │ HTTP/REST           │ WebSocket      │ HTTP             │
└───────────────┼─────────────────────┼───────────────┼─────────────────┘
                │                     │               │
┌───────────────▼──────┐  ┌───────────▼────────┐  ┌──▼──────────────────┐
│   API Server          │  │  Gateway Server     │  │  AI Agent Server    │
│   (apps/api)          │  │  (apps/gateway)     │  │  (apps/agent)       │
│                       │  │                     │  │                     │
│  Fastify + JWT auth   │  │  WebSocket (ws)     │  │  Fastify + Ollama   │
│  REST endpoints:      │  │  • Auth via JWT     │  │  • /chat endpoint   │
│  • /auth              │  │  • Channel sub/     │  │  • Summarize tool   │
│  • /workspaces        │  │    unsub            │  │  • Decision draft   │
│  • /channels          │  │  • Typing events    │  │  • Context-aware    │
│  • /messages          │  │  • Presence         │  │    responses        │
│  • /search            │  │  • Fan-out via      │  │                     │
│  • /decisions         │  │    Redis pub/sub    │  │  Self-hosted LLM:   │
│  • /client-portals    │  │                     │  │  Ollama (llama3,    │
│                       │  └────────┬────────────┘  │  mistral, etc.)     │
└────────┬──────────────┘           │               └─────────────────────┘
         │                          │
┌────────▼──────────────────────────▼──────────────────────────────────────┐
│                         DATA LAYER                                        │
│                                                                          │
│  ┌───────────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │   PostgreSQL 16        │    │   Redis 7         │    │  MinIO        │ │
│  │                        │    │                  │    │  (S3-compat)  │ │
│  │  • users               │    │  • Pub/Sub for   │    │               │ │
│  │  • workspaces          │    │    real-time msg │    │  • File       │ │
│  │  • channels            │    │  • Session cache │    │    uploads    │ │
│  │  • messages            │    │  • Rate limiting │    │  • Avatars    │ │
│  │  • decisions           │    │  • Presence TTL  │    │               │ │
│  │  • client_portals      │    │                  │    │               │ │
│  │  • pg_trgm for search  │    └──────────────────┘    └───────────────┘ │
│  └───────────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Real-Time Message Flow

```
User types message
       │
       ▼
  [Web Client] ──── POST /api/v1/messages/:channelId ──────► [API Server]
                                                                    │
                                                          Insert to PostgreSQL
                                                                    │
                                                         PUBLISH to Redis
                                                         channel:{channelId}
                                                                    │
                                                                    │
                                                    ┌───────────────▼──────────────┐
                                                    │      [Gateway Server]         │
                                                    │                              │
                                                    │  Redis SUBSCRIBE channel:*   │
                                                    │           │                  │
                                                    │           ▼                  │
                                                    │  Look up channelSubscribers  │
                                                    │           │                  │
                                                    │    ┌──────┴───────┐          │
                                                    │    │              │           │
                                                    │    ▼              ▼           │
                                                    │ [WS Client A] [WS Client B]  │
                                                    └──────────────────────────────┘
```

---

## AI Agent Flow (Community Edition)

```
User types @agent <query>
       │
       ▼
  [Web Client] ──── POST /chat ──────────────────────► [Agent Server]
                                                              │
                                                    Build system prompt
                                                    + inject tools list
                                                              │
                                                    Check for tool triggers
                                                    (summarize, decisions, draft)
                                                              │
                                                              ▼
                                                       [Ollama Server]
                                                    Local LLM inference
                                                    (llama3, mistral, etc.)
                                                              │
                                                              ▼
                                                    Return structured reply
                                                    + tools used list
                                                              │
                                                              ▼
                                                    [Web Client renders reply]
```

---

## Monorepo Structure

```
teamcord/
├── apps/
│   ├── api/              # Fastify REST API
│   │   └── src/
│   │       ├── index.ts          # App entry + plugin registration
│   │       └── routes/
│   │           ├── auth.ts       # Register, login, /me
│   │           ├── workspaces.ts # Workspace CRUD
│   │           ├── channels.ts   # Channel CRUD
│   │           ├── messages.ts   # Message CRUD + Redis publish
│   │           ├── search.ts     # Full-text search (PostgreSQL ilike/tsvector)
│   │           ├── decisions.ts  # Decision log CRUD
│   │           └── client-portal.ts  # Client portal invite management
│   │
│   ├── gateway/          # WebSocket real-time server
│   │   └── src/
│   │       └── index.ts  # WS server + Redis subscriber + fan-out
│   │
│   ├── agent/            # AI agent (Ollama-powered)
│   │   └── src/
│   │       ├── index.ts          # Fastify HTTP server
│   │       ├── ollama-client.ts  # Ollama API client
│   │       └── tools/
│   │           └── index.ts      # Built-in tools + AgentExecutor
│   │
│   └── web/              # Next.js 15 frontend
│       └── src/
│           ├── app/              # App Router pages
│           │   ├── page.tsx      # Landing page
│           │   ├── auth/         # Login + register
│           │   └── workspace/    # Main workspace view
│           ├── lib/
│           │   ├── api.ts        # Type-safe API client
│           │   └── store.ts      # Zustand global state
│           └── hooks/
│               └── use-gateway.ts  # WebSocket hook
│
├── packages/
│   ├── types/            # Shared TypeScript interfaces
│   │   └── src/index.ts  # All domain types + gateway event types
│   │
│   └── db/               # Drizzle ORM schema + client
│       └── src/
│           ├── index.ts          # DB client factory
│           └── schema/index.ts   # All table definitions
│
├── docker/               # Docker build files
│   ├── Dockerfile.api
│   ├── Dockerfile.gateway
│   ├── Dockerfile.agent
│   ├── Dockerfile.web
│   └── init.sql          # PostgreSQL extensions
│
├── docker-compose.yml    # Full self-hosted stack
├── .env.example          # Environment variable template
├── package.json          # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json            # Turborepo build pipeline
```

---

## Key Differentiators vs Discord

| Feature | Discord | TeamCord |
|---------|---------|----------|
| **Search** | Practically useless | PostgreSQL full-text search (pg_trgm) |
| **Client access** | None (give clients full server) | Client Portal — scoped channel access |
| **Decision tracking** | Lost in chat | First-class Decision Log |
| **AI assistant** | None (or paid bots) | Built-in Ollama agent (self-hosted, free) |
| **Data privacy** | Discord's servers | Your servers, your data |
| **Self-hosting** | Not possible | Docker Compose, 10 min setup |
| **Built for work** | Gaming community tool | Work-first from day one |

---

## Self-Hosting Setup

```bash
# 1. Clone the repository
git clone https://github.com/atreyakamat/teamcord
cd teamcord

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET and passwords

# 3. Start all services
docker compose up -d

# 4. Pull an LLM model for the AI agent
docker exec teamcord-ollama-1 ollama pull llama3

# 5. Run database migrations
docker exec teamcord-api-1 node -e "/* migrations run on startup */"

# 6. Open TeamCord
open http://localhost:3000
```

---

## Technology Choices

| Component | Technology | Why |
|-----------|-----------|-----|
| API | Fastify + TypeScript | 2× faster than Express, built-in schema validation |
| Real-time | WebSocket (ws) + Redis pub/sub | No Socket.io overhead, horizontally scalable |
| Database | PostgreSQL 16 | JSON support, full-text search, ACID |
| ORM | Drizzle ORM | Type-safe, zero-overhead, great migrations |
| Cache/Pub-Sub | Redis 7 | Fast pub/sub for gateway fan-out |
| File storage | MinIO | S3-compatible, self-hosted |
| AI inference | Ollama | Local LLM, no API keys, GPU optional |
| Frontend | Next.js 15 | SSR + app router, React 19 |
| State | Zustand | Minimal, no boilerplate |
| Monorepo | Turborepo + pnpm | Fast builds, shared packages |
| Containers | Docker Compose | One command to run everything |

---

## Security

- **JWT authentication** on all API routes (7-day tokens)
- **bcrypt** password hashing (cost factor 12)
- **Rate limiting** on API (200 req/min)
- **Helmet** HTTP headers on API
- **CORS** configured per environment
- **Client portals** use cryptographic invite tokens (32-byte random hex)
- **Zero external services** in community edition — all data stays on your server

---

## Roadmap

### v0.1 (Current — Architecture)
- [x] Monorepo structure
- [x] PostgreSQL schema (users, workspaces, channels, messages, decisions, client portals)
- [x] REST API (auth, workspaces, channels, messages, search, decisions, client portals)
- [x] WebSocket gateway with Redis pub/sub
- [x] AI agent with Ollama integration
- [x] Next.js web frontend
- [x] Docker Compose self-hosting

### v0.2
- [ ] Database migrations (drizzle-kit generate + migrate)
- [ ] File upload (MinIO integration)
- [ ] Voice channels (WebRTC via mediasoup)
- [ ] Full-text search with PostgreSQL tsvector triggers
- [ ] Emoji reactions
- [ ] Thread support

### v0.3
- [ ] Mobile-responsive web app
- [ ] Desktop notifications (PWA)
- [ ] Webhook integrations
- [ ] SAML/SSO for enterprise

### Plus tier (paid cloud)
- [ ] Managed hosting
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Priority support SLA
