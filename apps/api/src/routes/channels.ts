import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "@teamcord/db";
import { channels, channelMembers, workspaceMembers } from "@teamcord/db";
import { nanoid } from "nanoid";

const createChannelSchema = z.object({
  workspaceId: z.string(),
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-_]+$/),
  description: z.string().max(256).optional(),
  type: z.enum(["text", "voice", "announcement", "client-portal"]).default("text"),
  isPrivate: z.boolean().default(false),
  isClientVisible: z.boolean().default(false),
});

export async function channelRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/channels
  app.post("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = createChannelSchema.parse(request.body);

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

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const channelId = nanoid();

    const [channel] = await db
      .insert(channels)
      .values({
        id: channelId,
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        isPrivate: body.isPrivate,
        isClientVisible: body.isClientVisible,
      })
      .returning();

    // Auto-add creator
    await db.insert(channelMembers).values({
      channelId,
      userId,
    });

    return reply.status(201).send({ data: channel });
  });

  // GET /api/v1/channels?workspaceId=...
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId } = request.query as { workspaceId: string };

    if (!workspaceId) {
      return reply
        .status(400)
        .send({ error: "Bad Request", message: "workspaceId is required", statusCode: 400 });
    }

    // Check workspace membership
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

    const workspaceChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId))
      .orderBy(channels.position);

    return reply.send({ data: workspaceChannels });
  });

  // GET /api/v1/channels/:id
  app.get("/:id", async (request, reply) => {
    const db = (app as any).db;
    const { id } = request.params as { id: string };

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, id))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Not Found", statusCode: 404 });
    }

    return reply.send({ data: channel });
  });

  // DELETE /api/v1/channels/:id
  app.delete("/:id", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, id))
      .limit(1);

    if (!channel) {
      return reply.status(404).send({ error: "Not Found", statusCode: 404 });
    }

    // Check admin/owner
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

    if (!member || !["owner", "admin"].includes(member.role)) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    await db.delete(channels).where(eq(channels.id, id));

    return reply.send({ data: { deleted: true } });
  });
}
