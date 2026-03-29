import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, sql } from "@teamcord/db";
import { messages, channels, workspaceMembers, reactions } from "@teamcord/db";
import type { ReactionSummary } from "@teamcord/types";

// Emoji validation - supports unicode emojis and custom emoji format
const emojiSchema = z.object({
  emojiName: z.string().min(1).max(100),
  emojiId: z.string().optional(), // Custom emoji ID
  emojiAnimated: z.boolean().optional().default(false),
});

export async function reactionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // PUT /api/v1/messages/:channelId/:messageId/reactions/:emoji
  // Add a reaction to a message
  app.put("/:channelId/:messageId/reactions/:emoji", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { channelId, messageId, emoji } = request.params as {
      channelId: string;
      messageId: string;
      emoji: string;
    };

    // Decode URI component (emojis can be URL-encoded)
    const emojiName = decodeURIComponent(emoji);
    
    // Parse optional body for custom emoji info
    let emojiId: string | null = null;
    let emojiAnimated = false;
    
    try {
      const body = request.body as { emojiId?: string; emojiAnimated?: boolean } | undefined;
      if (body) {
        emojiId = body.emojiId ?? null;
        emojiAnimated = body.emojiAnimated ?? false;
      }
    } catch {
      // Body is optional
    }

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

    // Check message exists
    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)))
      .limit(1);

    if (!message) {
      return reply.status(404).send({ error: "Message not found", statusCode: 404 });
    }

    // Insert reaction (upsert - ignore if already exists)
    try {
      await db
        .insert(reactions)
        .values({
          messageId,
          userId,
          emojiId,
          emojiName,
          emojiAnimated,
        })
        .onConflictDoNothing();
    } catch (err: any) {
      // Handle unique constraint violation gracefully
      if (err.code !== "23505") {
        throw err;
      }
    }

    // Get updated reaction summary for this emoji
    const reactionUsers = await db
      .select({ userId: reactions.userId })
      .from(reactions)
      .where(and(eq(reactions.messageId, messageId), eq(reactions.emojiName, emojiName)));

    const summary: ReactionSummary = {
      emoji: emojiName,
      emojiId: emojiId ?? undefined,
      emojiAnimated,
      count: reactionUsers.length,
      userIds: reactionUsers.map((r) => r.userId),
      me: reactionUsers.some((r) => r.userId === userId),
    };

    // Update message reactions array (denormalized for fast reads)
    const allReactions = await db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, messageId));

    // Group by emoji
    const reactionMap = new Map<string, ReactionSummary>();
    for (const r of allReactions) {
      const key = r.emojiName;
      if (!reactionMap.has(key)) {
        reactionMap.set(key, {
          emoji: r.emojiName,
          emojiId: r.emojiId ?? undefined,
          emojiAnimated: r.emojiAnimated,
          count: 0,
          userIds: [],
        });
      }
      const rs = reactionMap.get(key)!;
      rs.count++;
      rs.userIds.push(r.userId);
    }

    await db
      .update(messages)
      .set({ reactions: Array.from(reactionMap.values()) })
      .where(eq(messages.id, messageId));

    // Publish reaction event
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "reaction:add",
          payload: {
            messageId,
            userId,
            emoji: emojiName,
            emojiId,
            emojiAnimated,
          },
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(200).send({ data: summary });
  });

  // DELETE /api/v1/messages/:channelId/:messageId/reactions/:emoji
  // Remove own reaction from a message
  app.delete("/:channelId/:messageId/reactions/:emoji", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { channelId, messageId, emoji } = request.params as {
      channelId: string;
      messageId: string;
      emoji: string;
    };

    const emojiName = decodeURIComponent(emoji);

    // Check channel and membership
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

    // Delete the reaction
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.userId, userId),
          eq(reactions.emojiName, emojiName)
        )
      );

    // Update denormalized reactions on message
    const allReactions = await db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, messageId));

    const reactionMap = new Map<string, ReactionSummary>();
    for (const r of allReactions) {
      const key = r.emojiName;
      if (!reactionMap.has(key)) {
        reactionMap.set(key, {
          emoji: r.emojiName,
          emojiId: r.emojiId ?? undefined,
          emojiAnimated: r.emojiAnimated,
          count: 0,
          userIds: [],
        });
      }
      const rs = reactionMap.get(key)!;
      rs.count++;
      rs.userIds.push(r.userId);
    }

    await db
      .update(messages)
      .set({ reactions: Array.from(reactionMap.values()) })
      .where(eq(messages.id, messageId));

    // Publish reaction removal event
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "reaction:remove",
          payload: {
            messageId,
            userId,
            emoji: emojiName,
          },
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(200).send({ data: { removed: true } });
  });

  // GET /api/v1/messages/:channelId/:messageId/reactions/:emoji
  // Get list of users who reacted with this emoji
  app.get("/:channelId/:messageId/reactions/:emoji", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { channelId, messageId, emoji } = request.params as {
      channelId: string;
      messageId: string;
      emoji: string;
    };
    const { limit = 100, after } = request.query as { limit?: number; after?: string };

    const emojiName = decodeURIComponent(emoji);

    // Check channel and membership
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

    // Get users who reacted
    const reactionUsers = await db
      .select()
      .from(reactions)
      .where(and(eq(reactions.messageId, messageId), eq(reactions.emojiName, emojiName)))
      .limit(Math.min(Number(limit), 100));

    return reply.send({
      data: {
        emoji: emojiName,
        count: reactionUsers.length,
        users: reactionUsers.map((r) => ({
          userId: r.userId,
          createdAt: r.createdAt,
        })),
      },
    });
  });

  // DELETE /api/v1/messages/:channelId/:messageId/reactions/:emoji/:userId
  // Remove another user's reaction (requires MANAGE_MESSAGES permission)
  app.delete("/:channelId/:messageId/reactions/:emoji/:userId", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: actorId } = request.user as { sub: string };
    const { channelId, messageId, emoji, userId: targetUserId } = request.params as {
      channelId: string;
      messageId: string;
      emoji: string;
      userId: string;
    };

    const emojiName = decodeURIComponent(emoji);

    // Check channel
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Channel not found", statusCode: 404 });
    }

    // Check actor is admin/owner
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, actorId)
        )
      )
      .limit(1);

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden - admin required", statusCode: 403 });
    }

    // Delete the reaction
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.userId, targetUserId),
          eq(reactions.emojiName, emojiName)
        )
      );

    // Update denormalized reactions
    const allReactions = await db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, messageId));

    const reactionMap = new Map<string, ReactionSummary>();
    for (const r of allReactions) {
      const key = r.emojiName;
      if (!reactionMap.has(key)) {
        reactionMap.set(key, {
          emoji: r.emojiName,
          emojiId: r.emojiId ?? undefined,
          emojiAnimated: r.emojiAnimated,
          count: 0,
          userIds: [],
        });
      }
      const rs = reactionMap.get(key)!;
      rs.count++;
      rs.userIds.push(r.userId);
    }

    await db
      .update(messages)
      .set({ reactions: Array.from(reactionMap.values()) })
      .where(eq(messages.id, messageId));

    // Publish
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "reaction:remove",
          payload: {
            messageId,
            userId: targetUserId,
            emoji: emojiName,
            removedBy: actorId,
          },
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(200).send({ data: { removed: true } });
  });

  // DELETE /api/v1/messages/:channelId/:messageId/reactions
  // Remove all reactions from a message (requires MANAGE_MESSAGES)
  app.delete("/:channelId/:messageId/reactions", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: actorId } = request.user as { sub: string };
    const { channelId, messageId } = request.params as {
      channelId: string;
      messageId: string;
    };

    // Check channel
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Channel not found", statusCode: 404 });
    }

    // Check actor is admin/owner
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, actorId)
        )
      )
      .limit(1);

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden - admin required", statusCode: 403 });
    }

    // Delete all reactions
    await db.delete(reactions).where(eq(reactions.messageId, messageId));

    // Clear denormalized reactions
    await db
      .update(messages)
      .set({ reactions: [] })
      .where(eq(messages.id, messageId));

    // Publish
    if (redis) {
      await redis.publish(
        `channel:${channelId}`,
        JSON.stringify({
          type: "reaction:remove_all",
          payload: {
            messageId,
            removedBy: actorId,
          },
          workspaceId: channel.workspaceId,
          channelId,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return reply.status(200).send({ data: { cleared: true } });
  });
}
