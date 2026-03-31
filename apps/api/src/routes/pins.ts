import { FastifyInstance } from "fastify";
import { db } from "@teamcord/db";
import { pinnedMessages, messages, channels, workspaceMembers } from "@teamcord/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface PinsParams {
  channelId: string;
  messageId?: string;
}

export async function pinsRoutes(fastify: FastifyInstance) {
  // Get pinned messages for a channel
  fastify.get<{ Params: PinsParams }>(
    "/channels/:channelId/pins",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { channelId } = request.params;
      const userId = request.user.id;

      // Verify user has access to this channel
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (!channel) {
        return reply.status(404).send({ error: "Channel not found" });
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        return reply.status(403).send({ error: "Not a member of this workspace" });
      }

      // Get pinned messages with message details
      const pins = await db
        .select({
          pinnedAt: pinnedMessages.pinnedAt,
          pinnedBy: pinnedMessages.pinnedBy,
          message: messages,
        })
        .from(pinnedMessages)
        .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
        .where(eq(pinnedMessages.channelId, channelId))
        .orderBy(desc(pinnedMessages.pinnedAt));

      return pins;
    }
  );

  // Pin a message
  fastify.put<{ Params: PinsParams }>(
    "/channels/:channelId/pins/:messageId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { channelId, messageId } = request.params;
      const userId = request.user.id;

      // Verify channel exists and user has access
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (!channel) {
        return reply.status(404).send({ error: "Channel not found" });
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        return reply.status(403).send({ error: "Not a member of this workspace" });
      }

      // TODO: Check MANAGE_MESSAGES permission for non-own messages
      // const hasPermission = checkPermission(membership.permissions, MANAGE_MESSAGES);

      // Verify message exists in this channel
      const message = await db.query.messages.findFirst({
        where: and(eq(messages.id, messageId!), eq(messages.channelId, channelId)),
      });

      if (!message) {
        return reply.status(404).send({ error: "Message not found in this channel" });
      }

      // Check if already pinned
      const existingPin = await db.query.pinnedMessages.findFirst({
        where: and(
          eq(pinnedMessages.channelId, channelId),
          eq(pinnedMessages.messageId, messageId!)
        ),
      });

      if (existingPin) {
        return reply.status(400).send({ error: "Message is already pinned" });
      }

      // Check pin limit (Discord allows 50 pins per channel)
      const pinCount = await db
        .select()
        .from(pinnedMessages)
        .where(eq(pinnedMessages.channelId, channelId));

      if (pinCount.length >= 50) {
        return reply.status(400).send({ error: "Maximum pins (50) reached for this channel" });
      }

      // Pin the message
      await db.insert(pinnedMessages).values({
        channelId,
        messageId: messageId!,
        pinnedBy: userId,
      });

      // Update message pinned flag
      await db
        .update(messages)
        .set({ pinned: true })
        .where(eq(messages.id, messageId!));

      // Publish pin event to Redis for real-time updates
      const redis = fastify.redis;
      const event = {
        type: "message:pin",
        payload: {
          channelId,
          messageId,
          pinnedBy: userId,
          pinnedAt: new Date().toISOString(),
        },
        workspaceId: channel.workspaceId,
        channelId,
        timestamp: new Date().toISOString(),
      };
      await redis.publish(`channel:${channelId}`, JSON.stringify(event));

      return { success: true, messageId, pinnedBy: userId };
    }
  );

  // Unpin a message
  fastify.delete<{ Params: PinsParams }>(
    "/channels/:channelId/pins/:messageId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { channelId, messageId } = request.params;
      const userId = request.user.id;

      // Verify channel exists and user has access
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId),
      });

      if (!channel) {
        return reply.status(404).send({ error: "Channel not found" });
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, channel.workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        return reply.status(403).send({ error: "Not a member of this workspace" });
      }

      // Remove pin
      const result = await db
        .delete(pinnedMessages)
        .where(
          and(
            eq(pinnedMessages.channelId, channelId),
            eq(pinnedMessages.messageId, messageId!)
          )
        );

      // Update message pinned flag
      await db
        .update(messages)
        .set({ pinned: false })
        .where(eq(messages.id, messageId!));

      // Publish unpin event
      const redis = fastify.redis;
      const event = {
        type: "message:unpin",
        payload: {
          channelId,
          messageId,
          unpinnedBy: userId,
        },
        workspaceId: channel.workspaceId,
        channelId,
        timestamp: new Date().toISOString(),
      };
      await redis.publish(`channel:${channelId}`, JSON.stringify(event));

      return { success: true };
    }
  );
}
