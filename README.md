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
```

## Tech Stack

- **API**: Fastify + TypeScript
- **Real-time**: WebSockets + Redis pub/sub
- **Database**: PostgreSQL 16 + Drizzle ORM
- **AI**: Ollama (local LLM — llama3, mistral, etc.)
- **Frontend**: Next.js 15 + React 19
- **File storage**: MinIO (S3-compatible, self-hosted)
- **Monorepo**: Turborepo + pnpm

## License

MIT — community edition is free forever. Self-host it, fork it, own your data.
