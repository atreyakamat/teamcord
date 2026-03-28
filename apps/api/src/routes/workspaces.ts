import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "@teamcord/db";
import { workspaces, workspaceMembers } from "@teamcord/db";
import { nanoid } from "nanoid";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/),
});

export async function workspaceRoutes(app: FastifyInstance) {
  // All workspace routes require auth
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/workspaces
  app.post("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = createWorkspaceSchema.parse(request.body);

    const existing = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, body.slug))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({
        error: "Conflict",
        message: "Workspace slug already taken",
        statusCode: 409,
      });
    }

    const workspaceId = nanoid();

    const [workspace] = await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: body.name,
        slug: body.slug,
        ownerId: userId,
        plan: "community",
      })
      .returning();

    // Add owner as member
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId,
      role: "owner",
    });

    return reply.status(201).send({ data: workspace });
  });

  // GET /api/v1/workspaces
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };

    const memberships = await db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return reply.send({ data: memberships.map((m: any) => m.workspace) });
  });

  // GET /api/v1/workspaces/:id
  app.get("/:id", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply
        .status(403)
        .send({ error: "Forbidden", statusCode: 403 });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    if (!workspace) {
      return reply
        .status(404)
        .send({ error: "Not Found", statusCode: 404 });
    }

    return reply.send({ data: workspace });
  });

  // GET /api/v1/workspaces/:id/members
  app.get("/:id/members", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, id));

    return reply.send({ data: members });
  });
}
