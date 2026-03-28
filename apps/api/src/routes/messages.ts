import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "@teamcord/db";
import { messages, channels, channelMembers, workspaceMembers } from "@teamcord/db";
import { nanoid } from "nanoid";

const createMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "system", "file", "decision"]).default("text"),
  replyToId: z.string().optional(),
});

export async function messageRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/messages/:channelId
  app.post("/:channelId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { channelId } = request.params as { channelId: string };
    const body = createMessageSchema.parse(request.body);

    // Check channel exists
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Channel not found", statusCode: 404 });
    }

    // Check workspace membership
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        id: nanoid(),
        channelId,
        authorId: userId,
        content: body.content,
        type: body.type,
        replyToId: body.replyToId ?? null,
        attachments: [],
        reactions: [],
      })
      .returning();

    // Publish to Redis for gateway to broadcast
    const redis = (app as any).redis;
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "message:create",
          payload: message,
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(201).send({ data: message });
  });

  // GET /api/v1/messages/:channelId?limit=50&before=<messageId>
  app.get("/:channelId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { channelId } = request.params as { channelId: string };
    const { limit = 50 } = request.query as { limit?: number };

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Channel not found", statusCode: 404 });
    }

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(Math.min(Number(limit), 100));

    return reply.send({ data: msgs.reverse() });
  });

  // PATCH /api/v1/messages/:channelId/:messageId
  app.patch("/:channelId/:messageId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { messageId } = request.params as { channelId: string; messageId: string };
    const { content } = z.object({ content: z.string().min(1).max(4000) }).parse(request.body);

    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.authorId, userId)))
      .limit(1);

    if (!message) {
      return reply.status(404).send({ error: "Message not found or not yours", statusCode: 404 });
    }

    const [updated] = await db
      .update(messages)
      .set({ content, edited: true, editedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();

    return reply.send({ data: updated });
  });

  // DELETE /api/v1/messages/:channelId/:messageId
  app.delete("/:channelId/:messageId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { messageId } = request.params as { channelId: string; messageId: string };

    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.authorId, userId)))
      .limit(1);

    if (!message) {
      return reply.status(404).send({ error: "Not found or forbidden", statusCode: 404 });
    }

    await db.delete(messages).where(eq(messages.id, messageId));

    return reply.send({ data: { deleted: true } });
  });
}
