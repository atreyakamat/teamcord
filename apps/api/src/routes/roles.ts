import { FastifyInstance } from "fastify";
import { db } from "@teamcord/db";
import { roles, memberRoles, workspaceMembers, workspaces } from "@teamcord/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

interface RoleParams {
  workspaceId: string;
  roleId?: string;
}

interface CreateRoleBody {
  name: string;
  color?: string;
  permissions?: string; // Bigint as string
  mentionable?: boolean;
}

interface UpdateRoleBody {
  name?: string;
  color?: string;
  permissions?: string;
  position?: number;
  mentionable?: boolean;
}

// Permission bits (Discord-compatible)
export const Permissions = {
  ADMINISTRATOR: BigInt(1) << BigInt(3),
  MANAGE_WORKSPACE: BigInt(1) << BigInt(5),
  MANAGE_CHANNELS: BigInt(1) << BigInt(4),
  MANAGE_ROLES: BigInt(1) << BigInt(28),
  MANAGE_MESSAGES: BigInt(1) << BigInt(13),
  KICK_MEMBERS: BigInt(1) << BigInt(1),
  BAN_MEMBERS: BigInt(1) << BigInt(2),
  VIEW_CHANNELS: BigInt(1) << BigInt(10),
  SEND_MESSAGES: BigInt(1) << BigInt(11),
  EMBED_LINKS: BigInt(1) << BigInt(14),
  ATTACH_FILES: BigInt(1) << BigInt(15),
  READ_MESSAGE_HISTORY: BigInt(1) << BigInt(16),
  MENTION_EVERYONE: BigInt(1) << BigInt(17),
  USE_EXTERNAL_EMOJIS: BigInt(1) << BigInt(18),
  CONNECT: BigInt(1) << BigInt(20),
  SPEAK: BigInt(1) << BigInt(21),
  MUTE_MEMBERS: BigInt(1) << BigInt(22),
  DEAFEN_MEMBERS: BigInt(1) << BigInt(23),
  MOVE_MEMBERS: BigInt(1) << BigInt(24),
  USE_VAD: BigInt(1) << BigInt(25),
  STREAM: BigInt(1) << BigInt(9),
};

function hasPermission(userPermissions: bigint, permission: bigint): boolean {
  // Administrator has all permissions
  if ((userPermissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
    return true;
  }
  return (userPermissions & permission) === permission;
}

async function getUserPermissions(userId: string, workspaceId: string): Promise<bigint> {
  // Check if user is workspace owner
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (workspace?.ownerId === userId) {
    // Owner has all permissions
    return BigInt("0xFFFFFFFFFFFFFFFF");
  }

  // Get user's roles
  const userRoles = await db
    .select({ permissions: roles.permissions })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(
      and(eq(memberRoles.userId, userId), eq(roles.workspaceId, workspaceId))
    );

  // Combine permissions from all roles
  let combined = BigInt(0);
  for (const role of userRoles) {
    combined |= BigInt(role.permissions ?? "0");
  }

  return combined;
}

export async function rolesRoutes(fastify: FastifyInstance) {
  // List roles for a workspace
  fastify.get<{ Params: RoleParams }>(
    "/workspaces/:workspaceId/roles",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const userId = request.user.id;

      // Verify membership
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        return reply.status(403).send({ error: "Not a member of this workspace" });
      }

      const workspaceRoles = await db.query.roles.findMany({
        where: eq(roles.workspaceId, workspaceId),
        orderBy: [asc(roles.position)],
      });

      return workspaceRoles.map((role) => ({
        ...role,
        permissions: role.permissions?.toString(),
      }));
    }
  );

  // Create a role
  fastify.post<{ Params: RoleParams; Body: CreateRoleBody }>(
    "/workspaces/:workspaceId/roles",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const { name, color, permissions, mentionable } = request.body;
      const userId = request.user.id;

      // Check MANAGE_ROLES permission
      const userPermissions = await getUserPermissions(userId, workspaceId);
      if (!hasPermission(userPermissions, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: "Missing MANAGE_ROLES permission" });
      }

      // Get highest position for new role
      const existingRoles = await db.query.roles.findMany({
        where: eq(roles.workspaceId, workspaceId),
        orderBy: [asc(roles.position)],
      });
      const maxPosition = existingRoles.length > 0 
        ? Math.max(...existingRoles.map(r => r.position ?? 0)) 
        : 0;

      const roleId = nanoid();
      const [newRole] = await db
        .insert(roles)
        .values({
          id: roleId,
          workspaceId,
          name,
          color: color ?? null,
          permissions: permissions ?? "0",
          position: maxPosition + 1,
          mentionable: mentionable ?? false,
          isEveryone: false,
        })
        .returning();

      return {
        ...newRole,
        permissions: newRole.permissions?.toString(),
      };
    }
  );

  // Update a role
  fastify.patch<{ Params: RoleParams; Body: UpdateRoleBody }>(
    "/workspaces/:workspaceId/roles/:roleId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId, roleId } = request.params;
      const { name, color, permissions, position, mentionable } = request.body;
      const userId = request.user.id;

      // Check MANAGE_ROLES permission
      const userPermissions = await getUserPermissions(userId, workspaceId);
      if (!hasPermission(userPermissions, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: "Missing MANAGE_ROLES permission" });
      }

      // Verify role exists
      const existingRole = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId!), eq(roles.workspaceId, workspaceId)),
      });

      if (!existingRole) {
        return reply.status(404).send({ error: "Role not found" });
      }

      // Cannot edit @everyone role name
      if (existingRole.isEveryone && name) {
        return reply.status(400).send({ error: "Cannot rename @everyone role" });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (position !== undefined) updateData.position = position;
      if (mentionable !== undefined) updateData.mentionable = mentionable;

      const [updatedRole] = await db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, roleId!))
        .returning();

      return {
        ...updatedRole,
        permissions: updatedRole.permissions?.toString(),
      };
    }
  );

  // Delete a role
  fastify.delete<{ Params: RoleParams }>(
    "/workspaces/:workspaceId/roles/:roleId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId, roleId } = request.params;
      const userId = request.user.id;

      // Check MANAGE_ROLES permission
      const userPermissions = await getUserPermissions(userId, workspaceId);
      if (!hasPermission(userPermissions, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: "Missing MANAGE_ROLES permission" });
      }

      // Verify role exists and is not @everyone
      const existingRole = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId!), eq(roles.workspaceId, workspaceId)),
      });

      if (!existingRole) {
        return reply.status(404).send({ error: "Role not found" });
      }

      if (existingRole.isEveryone) {
        return reply.status(400).send({ error: "Cannot delete @everyone role" });
      }

      // Remove role from all members first
      await db.delete(memberRoles).where(eq(memberRoles.roleId, roleId!));

      // Delete the role
      await db.delete(roles).where(eq(roles.id, roleId!));

      return { success: true };
    }
  );

  // Assign role to member
  fastify.put<{ Params: { workspaceId: string; userId: string; roleId: string } }>(
    "/workspaces/:workspaceId/members/:userId/roles/:roleId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId, userId: targetUserId, roleId } = request.params;
      const userId = request.user.id;

      // Check MANAGE_ROLES permission
      const userPermissions = await getUserPermissions(userId, workspaceId);
      if (!hasPermission(userPermissions, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: "Missing MANAGE_ROLES permission" });
      }

      // Verify target is a member
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId)
        ),
      });

      if (!membership) {
        return reply.status(404).send({ error: "User is not a member" });
      }

      // Verify role exists
      const role = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.workspaceId, workspaceId)),
      });

      if (!role) {
        return reply.status(404).send({ error: "Role not found" });
      }

      // Add role (ignore if already assigned)
      await db
        .insert(memberRoles)
        .values({
          userId: targetUserId,
          roleId,
        })
        .onConflictDoNothing();

      return { success: true };
    }
  );

  // Remove role from member
  fastify.delete<{ Params: { workspaceId: string; userId: string; roleId: string } }>(
    "/workspaces/:workspaceId/members/:userId/roles/:roleId",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId, userId: targetUserId, roleId } = request.params;
      const userId = request.user.id;

      // Check MANAGE_ROLES permission
      const userPermissions = await getUserPermissions(userId, workspaceId);
      if (!hasPermission(userPermissions, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: "Missing MANAGE_ROLES permission" });
      }

      // Remove role
      await db
        .delete(memberRoles)
        .where(
          and(eq(memberRoles.userId, targetUserId), eq(memberRoles.roleId, roleId))
        );

      return { success: true };
    }
  );

  // Get member's roles
  fastify.get<{ Params: { workspaceId: string; userId: string } }>(
    "/workspaces/:workspaceId/members/:userId/roles",
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { workspaceId, userId: targetUserId } = request.params;
      const userId = request.user.id;

      // Verify requester membership
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        return reply.status(403).send({ error: "Not a member of this workspace" });
      }

      // Get target's roles
      const userRoles = await db
        .select({
          id: roles.id,
          name: roles.name,
          color: roles.color,
          position: roles.position,
          permissions: roles.permissions,
        })
        .from(memberRoles)
        .innerJoin(roles, eq(memberRoles.roleId, roles.id))
        .where(
          and(
            eq(memberRoles.userId, targetUserId),
            eq(roles.workspaceId, workspaceId)
          )
        )
        .orderBy(asc(roles.position));

      return userRoles.map((role) => ({
        ...role,
        permissions: role.permissions?.toString(),
      }));
    }
  );
}
