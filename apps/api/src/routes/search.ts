import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, ilike, desc, or, gte, lte } from "@teamcord/db";
import { messages, channels, decisions, workspaceMembers, threads, users } from "@teamcord/db";

// Meilisearch client (optional, falls back to PostgreSQL if not available)
let meilisearch: any = null;

async function initMeilisearch() {
  const url = process.env["MEILISEARCH_URL"];
  const key = process.env["MEILISEARCH_KEY"];
  
  if (url) {
    try {
      const { MeiliSearch } = await import("meilisearch");
      meilisearch = new MeiliSearch({ host: url, apiKey: key });
      
      // Ensure indexes exist
      await meilisearch.createIndex("messages", { primaryKey: "id" }).catch(() => {});
      await meilisearch.createIndex("decisions", { primaryKey: "id" }).catch(() => {});
      await meilisearch.createIndex("threads", { primaryKey: "id" }).catch(() => {});
      
      // Configure searchable attributes
      const messagesIndex = meilisearch.index("messages");
      await messagesIndex.updateSettings({
        searchableAttributes: ["content", "authorUsername"],
        filterableAttributes: ["channelId", "workspaceId", "authorId", "createdAt"],
        sortableAttributes: ["createdAt"],
      });
      
      console.log("[search] Meilisearch connected and configured");
    } catch (e) {
      console.log("[search] Meilisearch not available, using PostgreSQL fallback");
      meilisearch = null;
    }
  }
}

initMeilisearch();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(256),
  workspaceId: z.string(),
  channelIds: z.string().optional(), // comma-separated
  authorId: z.string().optional(),
  before: z.string().optional(), // ISO date
  after: z.string().optional(), // ISO date
  type: z.enum(["message", "file", "channel", "decision", "thread", "all"]).optional(),
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

    // Use Meilisearch if available
    if (meilisearch && (!query.type || query.type === "all" || query.type === "message")) {
      return searchWithMeilisearch(query, reply);
    }

    // Fallback to PostgreSQL search
    return searchWithPostgres(db, query, reply);
  });

  // POST /api/v1/search/index - Index a message (called by API on message create)
  app.post("/index", async (request, reply) => {
    if (!meilisearch) {
      return reply.send({ indexed: false, reason: "Meilisearch not configured" });
    }

    const body = request.body as {
      type: string;
      id: string;
      content?: string;
      channelId?: string;
      workspaceId?: string;
      authorId?: string;
      authorUsername?: string;
      createdAt?: string;
    };

    try {
      const index = meilisearch.index(body.type + "s"); // "messages", "decisions", etc.
      await index.addDocuments([{
        id: body.id,
        content: body.content || "",
        channelId: body.channelId,
        workspaceId: body.workspaceId,
        authorId: body.authorId,
        authorUsername: body.authorUsername,
        createdAt: body.createdAt ? new Date(body.createdAt).getTime() : Date.now(),
      }]);

      return reply.send({ indexed: true });
    } catch (e) {
      return reply.status(500).send({ indexed: false, error: String(e) });
    }
  });

  // DELETE /api/v1/search/index/:type/:id - Remove from index
  app.delete("/index/:type/:id", async (request, reply) => {
    if (!meilisearch) {
      return reply.send({ removed: false, reason: "Meilisearch not configured" });
    }

    const { type, id } = request.params as { type: string; id: string };

    try {
      const index = meilisearch.index(type + "s");
      await index.deleteDocument(id);
      return reply.send({ removed: true });
    } catch (e) {
      return reply.status(500).send({ removed: false, error: String(e) });
    }
  });
}

async function searchWithMeilisearch(query: z.infer<typeof searchQuerySchema>, reply: any) {
  const filters: string[] = [];
  
  filters.push(`workspaceId = "${query.workspaceId}"`);
  
  if (query.channelIds) {
    const channelFilter = query.channelIds.split(",").map(id => `channelId = "${id.trim()}"`).join(" OR ");
    filters.push(`(${channelFilter})`);
  }
  
  if (query.authorId) {
    filters.push(`authorId = "${query.authorId}"`);
  }
  
  if (query.after) {
    filters.push(`createdAt >= ${new Date(query.after).getTime()}`);
  }
  
  if (query.before) {
    filters.push(`createdAt <= ${new Date(query.before).getTime()}`);
  }

  try {
    const messagesIndex = meilisearch.index("messages");
    const results = await messagesIndex.search(query.q, {
      filter: filters.join(" AND "),
      limit: query.limit,
      offset: query.offset,
      sort: ["createdAt:desc"],
      attributesToHighlight: ["content"],
      highlightPreTag: "**",
      highlightPostTag: "**",
    });

    const hits = results.hits.map((hit: any) => ({
      type: "message",
      id: hit.id,
      content: hit.content,
      highlight: hit._formatted?.content || hit.content,
      channelId: hit.channelId,
      authorId: hit.authorId,
      authorUsername: hit.authorUsername,
      createdAt: new Date(hit.createdAt).toISOString(),
      score: hit._score,
    }));

    return reply.send({
      data: hits,
      meta: {
        total: results.estimatedTotalHits,
        query: query.q,
        processingTimeMs: results.processingTimeMs,
        engine: "meilisearch",
      },
    });
  } catch (e) {
    console.error("[search] Meilisearch error:", e);
    // Fall through to PostgreSQL
  }
}

async function searchWithPostgres(db: any, query: z.infer<typeof searchQuerySchema>, reply: any) {
  const results: Array<{
    type: string;
    id: string;
    content?: string;
    highlight: string;
    channelId: string;
    channelName?: string;
    authorId?: string;
    createdAt: string | Date;
  }> = [];

  // Search messages using PostgreSQL ILIKE
  if (!query.type || query.type === "message" || query.type === "all") {
    const workspaceChannels = await db
      .select({ id: channels.id, name: channels.name })
      .from(channels)
      .where(eq(channels.workspaceId, query.workspaceId));

    let channelIds = workspaceChannels.map((c: { id: string }) => c.id);
    const channelMap = new Map(
      workspaceChannels.map((c: { id: string; name: string }) => [c.id, c.name])
    );

    // Filter by specific channels if provided
    if (query.channelIds) {
      const requestedIds = query.channelIds.split(",").map(id => id.trim());
      channelIds = channelIds.filter((id: string) => requestedIds.includes(id));
    }

    if (channelIds.length > 0) {
      let conditions = [ilike(messages.content, `%${query.q}%`)];
      
      if (query.authorId) {
        conditions.push(eq(messages.authorId, query.authorId));
      }
      
      if (query.after) {
        conditions.push(gte(messages.createdAt, new Date(query.after)));
      }
      
      if (query.before) {
        conditions.push(lte(messages.createdAt, new Date(query.before)));
      }

      const msgResults = await db
        .select({
          message: messages,
          author: users,
        })
        .from(messages)
        .leftJoin(users, eq(messages.authorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      for (const row of msgResults) {
        if (channelIds.includes(row.message.channelId)) {
          // Highlight search term in content
          const highlightedContent = row.message.content.replace(
            new RegExp(`(${escapeRegex(query.q)})`, "gi"),
            "**$1**"
          );
          
          results.push({
            type: "message",
            id: row.message.id,
            content: row.message.content,
            highlight: highlightedContent.slice(0, 300),
            channelId: row.message.channelId,
            channelName: channelMap.get(row.message.channelId) as string,
            authorId: row.message.authorId,
            createdAt: row.message.createdAt,
          });
        }
      }
    }
  }

  // Search decisions
  if (!query.type || query.type === "decision" || query.type === "all") {
    const decResults = await db
      .select({ d: decisions, c: channels })
      .from(decisions)
      .innerJoin(channels, eq(decisions.channelId, channels.id))
      .where(
        and(
          eq(decisions.workspaceId, query.workspaceId),
          or(
            ilike(decisions.title, `%${query.q}%`),
            ilike(decisions.summary, `%${query.q}%`)
          )
        )
      )
      .orderBy(desc(decisions.createdAt))
      .limit(query.limit);

    for (const row of decResults) {
      results.push({
        type: "decision",
        id: row.d.id,
        highlight: `${row.d.title}: ${row.d.summary.slice(0, 200)}`,
        channelId: row.d.channelId,
        channelName: row.c.name,
        createdAt: row.d.createdAt,
      });
    }
  }

  // Search threads
  if (!query.type || query.type === "thread" || query.type === "all") {
    const threadResults = await db
      .select({ t: threads, c: channels })
      .from(threads)
      .innerJoin(channels, eq(threads.channelId, channels.id))
      .where(
        and(
          eq(channels.workspaceId, query.workspaceId),
          ilike(threads.name, `%${query.q}%`)
        )
      )
      .orderBy(desc(threads.createdAt))
      .limit(query.limit);

    for (const row of threadResults) {
      results.push({
        type: "thread",
        id: row.t.id,
        highlight: row.t.name,
        channelId: row.t.channelId,
        channelName: row.c.name,
        createdAt: row.t.createdAt,
      });
    }
  }

  return reply.send({
    data: results,
    meta: {
      total: results.length,
      query: query.q,
      engine: "postgresql",
    },
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
