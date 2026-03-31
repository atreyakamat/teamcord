import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { createDb } from "@teamcord/db";
import { Redis } from "ioredis";

import { authRoutes } from "./routes/auth.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { channelRoutes } from "./routes/channels.js";
import { messageRoutes } from "./routes/messages.js";
import { reactionRoutes } from "./routes/reactions.js";
import { searchRoutes } from "./routes/search.js";
import { clientPortalRoutes } from "./routes/client-portal.js";
import { decisionRoutes } from "./routes/decisions.js";
import { threadRoutes } from "./routes/threads.js";
import { inviteRoutes } from "./routes/invites.js";
import { fileRoutes } from "./routes/files.js";
import { userRoutes } from "./routes/users.js";
import { wikiRoutes } from "./routes/wiki.js";
import { pinsRoutes } from "./routes/pins.js";
import { rolesRoutes } from "./routes/roles.js";

const PORT = Number(process.env["PORT"] ?? 3001);
const HOST = process.env["HOST"] ?? "0.0.0.0";
const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgres://teamcord:teamcord@localhost:5432/teamcord";
const JWT_SECRET = process.env["JWT_SECRET"] ?? "change-me-in-production";
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

async function buildApp() {
  const isDev = process.env["NODE_ENV"] === "development";
  const app = Fastify({
    logger: isDev
      ? { level: process.env["LOG_LEVEL"] ?? "info", transport: { target: "pino-pretty" } }
      : { level: process.env["LOG_LEVEL"] ?? "info" },
  });

  const db = createDb(DATABASE_URL);

  // Redis publisher for real-time event fan-out via gateway
  const redis = new Redis(REDIS_URL);

  // Decorate with db and redis so routes can access them
  app.decorate("db", db);
  app.decorate("redis", redis);

  // ─── Plugins ──────────────────────────────────────────────────────────────

  await app.register(helmet, { global: true });

  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "7d" },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "TeamCord API",
        description:
          "REST API for TeamCord — the team communication platform",
        version: "0.1.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Register authenticate decorator for route preHandlers
  app.decorate(
    "authenticate",
    async function (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: "Unauthorized", statusCode: 401 });
      }
    }
  );

  // ─── Routes ───────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(workspaceRoutes, { prefix: "/api/v1/workspaces" });
  await app.register(channelRoutes, { prefix: "/api/v1/channels" });
  await app.register(messageRoutes, { prefix: "/api/v1/messages" });
  await app.register(reactionRoutes, { prefix: "/api/v1/messages" });
  await app.register(threadRoutes, { prefix: "/api/v1" });
  await app.register(inviteRoutes, { prefix: "/api/v1/invites" });
  await app.register(fileRoutes, { prefix: "/api/v1/files" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(wikiRoutes, { prefix: "/api/v1" });
  await app.register(pinsRoutes, { prefix: "/api/v1" });
  await app.register(rolesRoutes, { prefix: "/api/v1" });
  await app.register(searchRoutes, { prefix: "/api/v1/search" });
  await app.register(clientPortalRoutes, {
    prefix: "/api/v1/client-portals",
  });
  await app.register(decisionRoutes, { prefix: "/api/v1/decisions" });

  // ─── Health check ─────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`TeamCord API running at http://${HOST}:${PORT}`);
    app.log.info(`Swagger docs at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
