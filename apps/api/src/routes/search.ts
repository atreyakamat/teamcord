import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, ilike, desc } from "@teamcord/db";
import { messages, channels, decisions, workspaceMembers } from "@teamcord/db";

const searchQuerySchema = z.object({
  q: z.string().min(1).max(256),
  workspaceId: z.string(),
  channelIds: z.string().optional(), // comma-separated
  type: z.enum(["message", "file", "channel", "decision"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /api/v1/search
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const query = searchQuerySchema.parse(request.query);

    // Check workspace membership
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, query.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const results: Array<{
      type: string;
      id: string;
      highlight: string;
      channelId: string;
      channelName: string;
      authorId?: string;
      createdAt: string | Date;
    }> = [];

    // Search messages using PostgreSQL ILIKE (full-text search via tsvector in production)
    if (!query.type || query.type === "message") {
      const workspaceChannels = await db
        .select({ id: channels.id, name: channels.name })
        .from(channels)
        .where(eq(channels.workspaceId, query.workspaceId));

      const channelIds = workspaceChannels.map((c: { id: string }) => c.id);
      const channelMap = new Map(
        workspaceChannels.map((c: { id: string; name: string }) => [c.id, c.name])
      );

      if (channelIds.length > 0) {
        const msgResults = await db
          .select()
          .from(messages)
          .where(ilike(messages.content, `%${query.q}%`))
          .orderBy(desc(messages.createdAt))
          .limit(query.limit)
          .offset(query.offset);

        for (const msg of msgResults) {
          if (channelIds.includes(msg.channelId)) {
            results.push({
              type: "message",
              id: msg.id,
              highlight: msg.content.slice(0, 200),
              channelId: msg.channelId,
              channelName: (channelMap.get(msg.channelId) as string | undefined) ?? "",
              authorId: msg.authorId,
              createdAt: msg.createdAt,
            });
          }
        }
      }
    }

    // Search decisions
    if (!query.type || query.type === "decision") {
      const decResults = await db
        .select({ d: decisions, c: channels })
        .from(decisions)
        .innerJoin(channels, eq(decisions.channelId, channels.id))
        .where(
          and(
            eq(decisions.workspaceId, query.workspaceId),
            ilike(decisions.title, `%${query.q}%`)
          )
        )
        .orderBy(desc(decisions.createdAt))
        .limit(query.limit);

      for (const row of decResults) {
        results.push({
          type: "decision",
          id: row.d.id,
          highlight: `${row.d.title}: ${row.d.summary.slice(0, 150)}`,
          channelId: row.d.channelId,
          channelName: row.c.name,
          createdAt: row.d.createdAt,
        });
      }
    }

    return reply.send({
      data: results,
      meta: { total: results.length, query: query.q },
    });
  });
}
