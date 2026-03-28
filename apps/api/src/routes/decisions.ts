import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "@teamcord/db";
import { decisions, channels, workspaceMembers, messages } from "@teamcord/db";
import { nanoid } from "nanoid";

const createDecisionSchema = z.object({
  workspaceId: z.string(),
  channelId: z.string(),
  messageId: z.string(),
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(2000),
  decidedBy: z.array(z.string()),
  tags: z.array(z.string()).default([]),
});

export async function decisionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/decisions — log a decision
  app.post("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = createDecisionSchema.parse(request.body);

    // Check workspace membership
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, body.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const [decision] = await db
      .insert(decisions)
      .values({
        id: nanoid(),
        workspaceId: body.workspaceId,
        channelId: body.channelId,
        messageId: body.messageId,
        title: body.title,
        summary: body.summary,
        decidedBy: body.decidedBy,
        tags: body.tags,
      })
      .returning();

    return reply.status(201).send({ data: decision });
  });

  // GET /api/v1/decisions?workspaceId=...
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId, limit = 50, offset = 0 } = request.query as {
      workspaceId: string;
      limit?: number;
      offset?: number;
    };

    if (!workspaceId) {
      return reply
        .status(400)
        .send({ error: "Bad Request", message: "workspaceId required", statusCode: 400 });
    }

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const decisionList = await db
      .select()
      .from(decisions)
      .where(eq(decisions.workspaceId, workspaceId))
      .limit(Math.min(Number(limit), 100))
      .offset(Number(offset));

    return reply.send({ data: decisionList });
  });

  // GET /api/v1/decisions/:id
  app.get("/:id", async (request, reply) => {
    const db = (app as any).db;
    const { id } = request.params as { id: string };

    const [decision] = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, id))
      .limit(1);

    if (!decision) {
      return reply.status(404).send({ error: "Not Found", statusCode: 404 });
    }

    return reply.send({ data: decision });
  });
}
