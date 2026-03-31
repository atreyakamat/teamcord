import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc, lt } from "@teamcord/db";
import { invites, workspaces, channels, workspaceMembers, users } from "@teamcord/db";
import { nanoid } from "nanoid";

const createInviteSchema = z.object({
  channelId: z.string().optional(),
  maxUses: z.number().int().min(0).max(100).optional().default(0), // 0 = unlimited
  maxAge: z.number().int().min(0).max(604800).optional().default(86400), // 0 = never expires, default 24h
});

export async function inviteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/invites - Create invite
  app.post("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId } = request.query as { workspaceId: string };
    const body = createInviteSchema.parse(request.body);

    if (!workspaceId) {
      return reply.status(400).send({ error: "workspaceId query parameter required", statusCode: 400 });
    }

    // Check membership with invite permission
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

    // Verify channel belongs to workspace if specified
    if (body.channelId) {
      const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, body.channelId), eq(channels.workspaceId, workspaceId)))
        .limit(1);

      if (!channel) {
        return reply.status(400).send({ error: "Channel not found in workspace", statusCode: 400 });
      }
    }

    // Generate unique invite code (8 chars)
    const code = nanoid(8);
    const expiresAt = body.maxAge > 0 ? new Date(Date.now() + body.maxAge * 1000) : null;

    const [invite] = await db
      .insert(invites)
      .values({
        code,
        workspaceId,
        channelId: body.channelId || null,
        creatorId: userId,
        maxUses: body.maxUses,
        uses: 0,
        expiresAt,
      })
      .returning();

    return reply.status(201).send({ data: { ...invite, url: `/invite/${code}` } });
  });

  // GET /api/v1/invites - List workspace invites
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId } = request.query as { workspaceId: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: "workspaceId query parameter required", statusCode: 400 });
    }

    // Check membership
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

    const inviteList = await db
      .select({
        code: invites.code,
        workspaceId: invites.workspaceId,
        channelId: invites.channelId,
        creatorId: invites.creatorId,
        maxUses: invites.maxUses,
        uses: invites.uses,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(invites)
      .leftJoin(users, eq(invites.creatorId, users.id))
      .where(eq(invites.workspaceId, workspaceId))
      .orderBy(desc(invites.createdAt));

    return reply.send({ data: inviteList });
  });

  // GET /api/v1/invites/:code - Get invite info (can be used before joining)
  app.get("/:code", async (request, reply) => {
    const db = (app as any).db;
    const { code } = request.params as { code: string };

    const [invite] = await db
      .select({
        code: invites.code,
        workspaceId: invites.workspaceId,
        channelId: invites.channelId,
        maxUses: invites.maxUses,
        uses: invites.uses,
        expiresAt: invites.expiresAt,
        workspace: {
          id: workspaces.id,
          name: workspaces.name,
          description: workspaces.description,
          iconUrl: workspaces.iconUrl,
        },
      })
      .from(invites)
      .leftJoin(workspaces, eq(invites.workspaceId, workspaces.id))
      .where(eq(invites.code, code))
      .limit(1);

    if (!invite) {
      return reply.status(404).send({ error: "Invite not found or expired", statusCode: 404 });
    }

    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return reply.status(410).send({ error: "Invite has expired", statusCode: 410 });
    }

    // Check uses
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return reply.status(410).send({ error: "Invite has reached max uses", statusCode: 410 });
    }

    return reply.send({ data: invite });
  });

  // POST /api/v1/invites/:code/use - Accept invite and join workspace
  app.post("/:code/use", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { code } = request.params as { code: string };

    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.code, code))
      .limit(1);

    if (!invite) {
      return reply.status(404).send({ error: "Invite not found", statusCode: 404 });
    }

    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return reply.status(410).send({ error: "Invite has expired", statusCode: 410 });
    }

    // Check uses
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return reply.status(410).send({ error: "Invite has reached max uses", statusCode: 410 });
    }

    // Check if already member
    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return reply.send({ data: { alreadyMember: true, workspaceId: invite.workspaceId } });
    }

    // Add user as member
    await db.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId,
      role: "member",
    });

    // Increment uses
    await db
      .update(invites)
      .set({ uses: invite.uses + 1 })
      .where(eq(invites.code, code));

    // Get workspace info to return
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceId))
      .limit(1);

    return reply.status(201).send({
      data: {
        joined: true,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          iconUrl: workspace.iconUrl,
        },
      },
    });
  });

  // DELETE /api/v1/invites/:code - Delete invite
  app.delete("/:code", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { code } = request.params as { code: string };

    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.code, code))
      .limit(1);

    if (!invite) {
      return reply.status(404).send({ error: "Invite not found", statusCode: 404 });
    }

    // Check if user is creator or admin
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const isCreator = invite.creatorId === userId;
    const isAdmin = ["owner", "admin"].includes(member.role);

    if (!isCreator && !isAdmin) {
      return reply.status(403).send({ error: "Only invite creator or admin can delete", statusCode: 403 });
    }

    await db.delete(invites).where(eq(invites.code, code));

    return reply.send({ data: { deleted: true } });
  });
}
