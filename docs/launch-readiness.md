# TeamCord Launch Readiness

Audit date: 2026-04-03

## Verdict

TeamCord is not ready for a full `v1.0` launch against the PRD yet.

The repo now has a proper public landing page and a cleaner `/app` product shell, but there are still launch-blocking gaps in auth, reactions, direct messages, screen sharing, PWA support, and file handling.

## What Was Completed In This Pass

- Added a public landing page at `/` and moved the product shell to `/app`.
- Removed prototype-only whiteboard and kanban entry points from the main web shell.
- Centralized frontend API, gateway, and voice URL configuration so the web app no longer depends on hardcoded `localhost` URLs.
- Updated the web Docker image to serve the production build instead of running the Vite dev server in production.
- Fixed reverse proxy routing so `/api/*` points to `messaging` and `/voice/*` points to the voice service.
- Added a `/health` endpoint to the messaging service for deployment health checks.

## PRD v1.0 Checklist

| PRD launch requirement | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Core messaging: channels, threads, DMs, reactions | Partial | `services/messaging/cmd/messaging/main.go`, `apps/web/src/components/chat/ReactionList.tsx`, `apps/web/src/stores/auth.ts` | Channels and threads exist. DMs are not implemented. Reactions have frontend calls but no matching backend routes. |
| Voice and video calls | Partial | `apps/web/src/hooks/useVoice.ts`, `services/voice/src/index.ts` | Voice/video foundation exists. End-to-end production verification was not possible in this environment. |
| Screen sharing | Missing | `apps/web/src/components/voice/VoiceChannel.tsx` | The UI still shows `Screen share not implemented yet`. |
| Basic AI agent: `/summarise`, `/decide`, `@agent` mentions | Partial | `services/ai-agent/main.py`, `services/ai-agent/agent/core.py` | Trigger handling exists. Full runtime integration was not exercised here. |
| Full-text search | Partial | `services/messaging/cmd/messaging/main.go`, `services/messaging/internal/search/repository.go` | Search route and Meilisearch integration exist. End-to-end indexing was not verified. |
| Self-host Docker Compose install | Partial | `docker-compose.yml`, `docker-compose.prod.yml`, `infra/caddy/Caddyfile` | Compose exists and was hardened in this pass, but the full stack was not brought up and validated. |
| Web PWA client | Missing | `apps/web` | No manifest, service worker, or PWA registration is present. |
| Keycloak auth with Google / GitHub social login | Missing | `apps/web/src/stores/auth.ts`, `services/messaging/cmd/messaging/main.go`, `docker-compose.yml` | Keycloak is in infra, but the backend does not expose the auth routes the web client expects. |

## Launch Blockers

1. Auth is not wired end-to-end.
   The web client calls `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/users/@me`, and `/api/v1/workspaces/@me` in `apps/web/src/stores/auth.ts`, but the messaging service does not expose those routes in `services/messaging/cmd/messaging/main.go`.

2. Reactions are not wired end-to-end.
   The UI calls reaction endpoints in `apps/web/src/components/chat/ReactionList.tsx` and `apps/web/src/components/chat/Message.tsx`, but there are no matching HTTP handlers in `services/messaging/cmd/messaging/main.go`.

3. Direct messages are still absent.
   The PRD marks DMs as core launch scope, but there is no DM route set or dedicated implementation in the current service layer.

4. Screen sharing is still missing.
   The voice UI explicitly shows it as unimplemented in `apps/web/src/components/voice/VoiceChannel.tsx`.

5. File handling is not ready.
   The files service is still a placeholder: `services/files/Dockerfile`.

6. PWA support is missing.
   The web app currently ships as a standard Vite SPA with no manifest or offline/runtime install support.

## Verification Performed

- `corepack pnpm --filter @teamcord/web build`
  Result: passed.

- `corepack pnpm install`
  Result: passed.

- `corepack pnpm build`
  Result: failed in this environment because Turborepo could not resolve a `pnpm` binary on `PATH`.

- `python -m py_compile` across `services/ai-agent`
  Result: passed.

## Verification Not Performed

- Go service compilation could not be run because `go` is not installed in this environment.
- A full `docker compose` launch and browser smoke test were not run in this environment.
- A successful root monorepo build was not completed because the environment blocks Corepack from writing the global `pnpm` shim that Turborepo expects.
