import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "@teamcord/db";
import { clientPortals, workspaceMembers } from "@teamcord/db";
import { nanoid } from "nanoid";
import { randomBytes } from "crypto";

const createPortalSchema = z.object({
  workspaceId: z.string(),
  clientEmail: z.string().email(),
  clientName: z.string().min(1).max(128),
  accessibleChannelIds: z.array(z.string()),
  expiresAt: z.string().datetime().optional(),
});

export async function clientPortalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/client-portals — create a client portal invite
  app.post("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = createPortalSchema.parse(request.body);

    // Only admins/owners can create portals
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

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const inviteToken = randomBytes(32).toString("hex");

    const [portal] = await db
      .insert(clientPortals)
      .values({
        id: nanoid(),
        workspaceId: body.workspaceId,
        clientEmail: body.clientEmail,
        clientName: body.clientName,
        accessibleChannelIds: body.accessibleChannelIds,
        inviteToken,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .returning();

    const baseUrl = process.env["APP_URL"] ?? "http://localhost:3000";

    return reply.status(201).send({
      data: {
        ...portal,
        inviteUrl: `${baseUrl}/portal/join/${inviteToken}`,
      },
    });
  });

  // GET /api/v1/client-portals?workspaceId=...
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId } = request.query as { workspaceId: string };

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

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const portals = await db
      .select()
      .from(clientPortals)
      .where(eq(clientPortals.workspaceId, workspaceId));

    return reply.send({ data: portals });
  });

  // GET /api/v1/client-portals/join/:token — public route to validate invite
  app.get("/join/:token", async (request, reply) => {
    const db = (app as any).db;
    const { token } = request.params as { token: string };

    const [portal] = await db
      .select()
      .from(clientPortals)
      .where(eq(clientPortals.inviteToken, token))
      .limit(1);

    if (!portal) {
      return reply
        .status(404)
        .send({ error: "Invalid or expired invite", statusCode: 404 });
    }

    if (portal.expiresAt && new Date(portal.expiresAt) < new Date()) {
      return reply
        .status(410)
        .send({ error: "Invite has expired", statusCode: 410 });
    }

    return reply.send({
      data: {
        workspaceId: portal.workspaceId,
        clientName: portal.clientName,
        accessibleChannelIds: portal.accessibleChannelIds,
      },
    });
  });
}
