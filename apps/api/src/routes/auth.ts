import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "@teamcord/db";
import { users, sessions } from "@teamcord/db";
import { nanoid } from "nanoid";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_-]+$/),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const db = (app as any).db;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({
        error: "Conflict",
        message: "Email already registered",
        statusCode: 409,
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        id: nanoid(),
        email: body.email,
        username: body.username,
        displayName: body.displayName,
        passwordHash,
      })
      .returning();

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.status(201).send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
    });
  });

  // POST /api/v1/auth/login
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const db = (app as any).db;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });

    return reply.send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  });

  // GET /api/v1/auth/me
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const db = (app as any).db;
      const { sub } = request.user as { sub: string };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, sub))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ error: "Not Found", statusCode: 404 });
      }

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      });
    }
  );

  // POST /api/v1/auth/logout
  app.post(
    "/logout",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      return reply.send({ data: { message: "Logged out successfully" } });
    }
  );
}

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>;
  }
}
