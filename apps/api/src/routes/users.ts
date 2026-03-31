import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "@teamcord/db";
import { users, workspaceMembers } from "@teamcord/db";

const updateProfileSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(32).optional(),
  avatarUrl: z.string().url().max(512).optional().nullable(),
  status: z.enum(["online", "idle", "dnd", "offline"]).optional(),
  customStatus: z.string().max(128).optional().nullable(),
});

const updateSettingsSchema = z.object({
  theme: z.enum(["dark", "light", "auto"]).optional(),
  notifications: z.object({
    desktop: z.boolean().optional(),
    mobile: z.boolean().optional(),
    email: z.boolean().optional(),
    sounds: z.boolean().optional(),
    mentions: z.enum(["all", "direct", "none"]).optional(),
  }).optional(),
  privacy: z.object({
    showOnlineStatus: z.boolean().optional(),
    allowDirectMessages: z.enum(["everyone", "friends", "none"]).optional(),
  }).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /api/v1/users/@me - Get current user profile
  app.get("/@me", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: "User not found", statusCode: 404 });
    }

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        customStatus: user.customStatus,
        createdAt: user.createdAt,
      },
    });
  });

  // PATCH /api/v1/users/@me - Update current user profile
  app.patch("/@me", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const body = updateProfileSchema.parse(request.body);

    // If updating username, check uniqueness
    if (body.username) {
      const [existing] = await db
        .select()
        .from(users)
        .where(and(eq(users.username, body.username)))
        .limit(1);

      if (existing && existing.id !== userId) {
        return reply.status(409).send({ error: "Username already taken", statusCode: 409 });
      }
    }

    const updateData: Record<string, any> = {};
    if (body.username !== undefined) updateData.username = body.username;
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.customStatus !== undefined) updateData.customStatus = body.customStatus;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: "No fields to update", statusCode: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Broadcast presence update if status changed
    if (body.status !== undefined && redis) {
      // Get all workspaces user is in
      const memberships = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));

      for (const { workspaceId } of memberships) {
        await redis.publish(
          `workspace:${workspaceId}`,
          JSON.stringify({
            type: "presence:update",
            payload: {
              userId,
              status: body.status,
              customStatus: body.customStatus,
            },
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    return reply.send({
      data: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        status: updated.status,
        customStatus: updated.customStatus,
      },
    });
  });

  // GET /api/v1/users/@me/settings - Get user settings
  app.get("/@me/settings", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };

    const [user] = await db
      .select({ settings: users.settings })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: "User not found", statusCode: 404 });
    }

    // Default settings if none set
    const defaultSettings = {
      theme: "dark",
      notifications: {
        desktop: true,
        mobile: true,
        email: false,
        sounds: true,
        mentions: "all",
      },
      privacy: {
        showOnlineStatus: true,
        allowDirectMessages: "everyone",
      },
    };

    return reply.send({
      data: { ...defaultSettings, ...(user.settings as object || {}) },
    });
  });

  // PATCH /api/v1/users/@me/settings - Update user settings
  app.patch("/@me/settings", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = updateSettingsSchema.parse(request.body);

    const [user] = await db
      .select({ settings: users.settings })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: "User not found", statusCode: 404 });
    }

    // Merge with existing settings
    const currentSettings = user.settings as object || {};
    const newSettings = {
      ...currentSettings,
      ...body,
      notifications: {
        ...(currentSettings as any).notifications,
        ...body.notifications,
      },
      privacy: {
        ...(currentSettings as any).privacy,
        ...body.privacy,
      },
    };

    await db
      .update(users)
      .set({ settings: newSettings })
      .where(eq(users.id, userId));

    return reply.send({ data: newSettings });
  });

  // GET /api/v1/users/@me/workspaces - List user's workspaces
  app.get("/@me/workspaces", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };

    const memberships = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(desc(workspaceMembers.joinedAt));

    // This just returns membership data, actual workspace details from /workspaces/@me
    return reply.send({ data: memberships });
  });

  // GET /api/v1/users/:userId - Get user profile (limited info)
  app.get("/:userId", async (request, reply) => {
    const db = (app as any).db;
    const { userId } = request.params as { userId: string };

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        status: users.status,
        customStatus: users.customStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: "User not found", statusCode: 404 });
    }

    return reply.send({ data: user });
  });

  // PATCH /api/v1/users/@me/presence - Update presence status
  app.patch("/@me/presence", async (request, reply) => {
    const db = (app as any).db;
    const redis = (app as any).redis;
    const { sub: userId } = request.user as { sub: string };
    const { status, customStatus } = z.object({
      status: z.enum(["online", "idle", "dnd", "offline"]).optional(),
      customStatus: z.string().max(128).optional().nullable(),
    }).parse(request.body);

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (customStatus !== undefined) updateData.customStatus = customStatus;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: "No fields to update", statusCode: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Broadcast to all workspaces
    if (redis) {
      const memberships = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));

      for (const { workspaceId } of memberships) {
        await redis.publish(
          `workspace:${workspaceId}`,
          JSON.stringify({
            type: "presence:update",
            payload: {
              userId,
              status: updated.status,
              customStatus: updated.customStatus,
            },
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    return reply.send({
      data: {
        status: updated.status,
        customStatus: updated.customStatus,
      },
    });
  });
}
