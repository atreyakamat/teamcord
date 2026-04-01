import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql } from "@teamcord/db";
import { threads, threadMembers, messages, channels, workspaceMembers, users } from "@teamcord/db";
import { nanoid } from "nanoid";

const createThreadSchema = z.object({
  name: z.string().min(1).max(100),
  parentMessageId: z.string(),
});

const updateThreadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["open", "resolved", "archived"]).optional(),
});

export async function threadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/channels/:channelId/threads - Start a thread from a message
  app.post("/channels/:channelId/threads", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { channelId } = request.params as { channelId: string };
    const body = createThreadSchema.parse(request.body);

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

    // Check parent message exists
    const [parentMessage] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, body.parentMessageId), eq(messages.channelId, channelId)))
      .limit(1);

    if (!parentMessage) {
      return reply.status(404).send({ error: "Parent message not found", statusCode: 404 });
    }

    // Create thread
    const threadId = nanoid();
    const [thread] = await db
      .insert(threads)
      .values({
        id: threadId,
        channelId,
        name: body.name,
        creatorId: userId,
        parentMessageId: body.parentMessageId,
        status: "open",
        messageCount: 0,
        memberCount: 1,
        lastActivityAt: new Date(),
      })
      .returning();

    // Add creator as first member
    await db.insert(threadMembers).values({
      threadId,
      userId,
    });

    // Update parent message type to thread_starter
    await db
      .update(messages)
      .set({ type: "thread_starter" })
      .where(eq(messages.id, body.parentMessageId));

    // Publish event
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "thread:create",
          payload: thread,
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(201).send({ data: thread });
  });

  // GET /api/v1/channels/:channelId/threads - List threads in channel
  app.get("/channels/:channelId/threads", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { channelId } = request.params as { channelId: string };
    const { status, limit = 50, offset = 0 } = request.query as {
      status?: string;
      limit?: number;
      offset?: number;
    };

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

    let query = db
      .select()
      .from(threads)
      .where(eq(threads.channelId, channelId));

    if (status) {
      query = query.where(eq(threads.status, status as any));
    }

    const threadList = await query
      .orderBy(desc(threads.lastActivityAt))
      .limit(Math.min(Number(limit), 100))
      .offset(Number(offset));

    return reply.send({ data: threadList });
  });

  // GET /api/v1/threads/:threadId - Get thread details
  app.get("/threads/:threadId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    // Check channel access
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
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

    // Get thread creator info
    const [creator] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, thread.creatorId))
      .limit(1);

    return reply.send({ data: { ...thread, creator } });
  });

  // PATCH /api/v1/threads/:threadId - Update thread
  app.patch("/threads/:threadId", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };
    const body = updateThreadSchema.parse(request.body);

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Channel not found", statusCode: 404 });
    }

    // Check membership (creator or admin can update)
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

    const isCreator = thread.creatorId === userId;
    const isAdmin = ["owner", "admin"].includes(member.role);

    if (!isCreator && !isAdmin) {
      return reply.status(403).send({ error: "Only creator or admin can update thread", statusCode: 403 });
    }

    const updateData: Record<string, any> = {};
    if (body.name) updateData.name = body.name;
    if (body.status) updateData.status = body.status;

    const [updated] = await db
      .update(threads)
      .set(updateData)
      .where(eq(threads.id, threadId))
      .returning();

    // Publish event
    if (redis) {
      await redis.publish(
        `channel:${thread.channelId}`,
        JSON.stringify({
          type: "thread:update",
          payload: updated,
          workspaceId: channel.workspaceId,
          channelId: thread.channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.send({ data: updated });
  });

  // GET /api/v1/threads/:threadId/members - List thread members
  app.get("/threads/:threadId/members", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
      .limit(1);

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel!.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const members = await db
      .select({
        threadId: threadMembers.threadId,
        userId: threadMembers.userId,
        joinedAt: threadMembers.joinedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(threadMembers)
      .leftJoin(users, eq(threadMembers.userId, users.id))
      .where(eq(threadMembers.threadId, threadId));

    return reply.send({ data: members });
  });

  // PUT /api/v1/threads/:threadId/members/@me - Join thread
  app.put("/threads/:threadId/members/@me", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
      .limit(1);

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel!.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    // Check if already member
    const [existing] = await db
      .select()
      .from(threadMembers)
      .where(and(eq(threadMembers.threadId, threadId), eq(threadMembers.userId, userId)))
      .limit(1);

    if (existing) {
      return reply.send({ data: existing });
    }

    await db.insert(threadMembers).values({
      threadId,
      userId,
    });

    // Update member count
    await db
      .update(threads)
      .set({ memberCount: sql`${threads.memberCount} + 1` })
      .where(eq(threads.id, threadId));

    return reply.status(201).send({ data: { threadId, userId, joinedAt: new Date().toISOString() } });
  });

  // DELETE /api/v1/threads/:threadId/members/@me - Leave thread
  app.delete("/threads/:threadId/members/@me", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };

    await db
      .delete(threadMembers)
      .where(and(eq(threadMembers.threadId, threadId), eq(threadMembers.userId, userId)));

    // Update member count
    await db
      .update(threads)
      .set({ memberCount: sql`GREATEST(${threads.memberCount} - 1, 0)` })
      .where(eq(threads.id, threadId));

    return reply.send({ data: { left: true } });
  });

  // GET /api/v1/threads/:threadId/messages - Get messages in thread
  app.get("/threads/:threadId/messages", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };
    const { limit = 50, before } = request.query as { limit?: number; before?: string };

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
      .limit(1);

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel!.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    // Get messages that reference the parent message (thread replies)
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.replyToId, thread.parentMessageId))
      .orderBy(desc(messages.createdAt))
      .limit(Math.min(Number(limit), 100));

    return reply.send({ data: msgs.reverse() });
  });

  // POST /api/v1/threads/:threadId/messages - Post message to thread
  app.post("/threads/:threadId/messages", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { threadId } = request.params as { threadId: string };
    const { content } = z.object({ content: z.string().min(1).max(4000) }).parse(request.body);

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return reply.status(404).send({ error: "Thread not found", statusCode: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, thread.channelId))
      .limit(1);

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel!.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    // Create message as reply to parent
    const [message] = await db
      .insert(messages)
      .values({
        id: nanoid(),
        channelId: thread.channelId,
        authorId: userId,
        content,
        type: "text",
        replyToId: thread.parentMessageId,
        attachments: [],
        reactions: [],
      })
      .returning();

    // Update thread stats
    await db
      .update(threads)
      .set({
        messageCount: sql`${threads.messageCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    // Auto-join thread if not member
    const [threadMember] = await db
      .select()
      .from(threadMembers)
      .where(and(eq(threadMembers.threadId, threadId), eq(threadMembers.userId, userId)))
      .limit(1);

    if (!threadMember) {
      await db.insert(threadMembers).values({ threadId, userId });
      await db
        .update(threads)
        .set({ memberCount: sql`${threads.memberCount} + 1` })
        .where(eq(threads.id, threadId));
    }

    // Publish event
    if (redis) {
      await redis.publish(
        `channel:${thread.channelId}`,
        JSON.stringify({
          type: "message:create",
          payload: { ...message, threadId },
          workspaceId: channel!.workspaceId,
          channelId: thread.channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(201).send({ data: message });
  });
}
