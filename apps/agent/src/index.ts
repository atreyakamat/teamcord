import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { OllamaClient } from "./ollama-client.js";
import { AgentExecutor } from "./tools/index.js";
import type { AgentRequest } from "@teamcord/types";

const PORT = Number(process.env["AGENT_PORT"] ?? 3003);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const agentRequestSchema = z.object({
  sessionId: z.string(),
  workspaceId: z.string(),
  channelId: z.string(),
  userId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  context: z
    .object({
      recentMessages: z.array(z.any()).optional(),
      decisions: z.array(z.any()).optional(),
      channelInfo: z.any().optional(),
    })
    .optional(),
});

async function buildApp() {
  const isDev = process.env["NODE_ENV"] === "development";
  const app = Fastify({
    logger: isDev
      ? { level: process.env["LOG_LEVEL"] ?? "info", transport: { target: "pino-pretty" } }
      : { level: process.env["LOG_LEVEL"] ?? "info" },
  });

  const llm = new OllamaClient();
  const executor = new AgentExecutor(llm);

  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  });

  // Health check
  app.get("/health", async () => {
    const ollamaHealthy = await llm.isHealthy();
    const models = ollamaHealthy ? await llm.listModels() : [];
    return {
      status: "ok",
      ollama: ollamaHealthy ? "connected" : "unavailable",
      models,
    };
  });

  // POST /chat — main agent chat endpoint
  app.post("/chat", async (request, reply) => {
    let body: AgentRequest;
    try {
      body = agentRequestSchema.parse(request.body) as AgentRequest;
    } catch (err) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid request body",
        statusCode: 400,
      });
    }

    const ollamaHealthy = await llm.isHealthy();
    if (!ollamaHealthy) {
      return reply.status(503).send({
        error: "Service Unavailable",
        message:
          "AI agent is not available. Make sure Ollama is running. " +
          "See https://ollama.ai for setup instructions.",
        statusCode: 503,
      });
    }

    try {
      const { reply: agentReply, toolsUsed } = await executor.run(
        body.messages,
        body.context ?? {}
      );

      return reply.send({
        data: {
          sessionId: body.sessionId,
          reply: agentReply,
          toolsUsed,
        },
      });
    } catch (err) {
      app.log.error(err, "Agent execution error");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to get agent response",
        statusCode: 500,
      });
    }
  });

  // GET /tools — list available tools
  app.get("/tools", async () => {
    const { TOOLS } = await import("./tools/index.js");
    return {
      data: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    };
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`TeamCord Agent running at http://${HOST}:${PORT}`);
    app.log.info(
      "Using Ollama at: " + (process.env["OLLAMA_URL"] ?? "http://localhost:11434")
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
