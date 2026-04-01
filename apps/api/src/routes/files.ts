import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "@teamcord/db";
import { files, channels, workspaceMembers, users } from "@teamcord/db";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MINIO_ENDPOINT = process.env["MINIO_ENDPOINT"] ?? "http://localhost:9000";
const MINIO_ACCESS_KEY = process.env["MINIO_ACCESS_KEY"] ?? "minioadmin";
const MINIO_SECRET_KEY = process.env["MINIO_SECRET_KEY"] ?? "minioadmin";
const MINIO_BUCKET = process.env["MINIO_BUCKET"] ?? "teamcord";

const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

const initiateUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // Max 50MB
  channelId: z.string().optional(),
  messageId: z.string().optional(),
});

const confirmUploadSchema = z.object({
  fileId: z.string(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

export async function fileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // POST /api/v1/files/upload - Initiate upload (returns presigned URL)
  app.post("/upload", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId } = request.query as { workspaceId: string };
    const body = initiateUploadSchema.parse(request.body);

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

    // If channelId provided, verify it belongs to workspace
    if (body.channelId) {
      const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, body.channelId), eq(channels.workspaceId, workspaceId)))
        .limit(1);

      if (!channel) {
        return reply.status(400).send({ error: "Channel not in workspace", statusCode: 400 });
      }
    }

    // Generate file ID and storage key
    const fileId = nanoid();
    const ext = body.filename.split(".").pop() || "";
    const storageKey = `${workspaceId}/${fileId}${ext ? "." + ext : ""}`;

    // Create pending file record
    const [file] = await db
      .insert(files)
      .values({
        id: fileId,
        workspaceId,
        uploaderId: userId,
        filename: body.filename,
        mimeType: body.mimeType,
        size: body.size,
        storageKey,
        channelId: body.channelId || null,
        messageId: body.messageId || null,
        status: "pending",
      })
      .returning();

    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: storageKey,
      ContentType: body.mimeType,
      ContentLength: body.size,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return reply.status(201).send({
      data: {
        fileId,
        uploadUrl,
        storageKey,
        expiresIn: 3600,
      },
    });
  });

  // POST /api/v1/files/confirm - Confirm upload complete
  app.post("/confirm", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const body = confirmUploadSchema.parse(request.body);

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, body.fileId), eq(files.uploaderId, userId)))
      .limit(1);

    if (!file) {
      return reply.status(404).send({ error: "File not found", statusCode: 404 });
    }

    if (file.status === "confirmed") {
      return reply.send({ data: file });
    }

    // Update file status and optionally dimensions
    const updateData: Record<string, any> = { status: "confirmed" };
    if (body.width) updateData.width = body.width;
    if (body.height) updateData.height = body.height;

    const [updated] = await db
      .update(files)
      .set(updateData)
      .where(eq(files.id, body.fileId))
      .returning();

    // Generate download URL
    const command = new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: file.storageKey,
    });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 86400 });

    return reply.send({
      data: {
        ...updated,
        url: downloadUrl,
      },
    });
  });

  // GET /api/v1/files - List files in workspace
  app.get("/", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { workspaceId, channelId, uploaderId, mimeType, limit = 50, offset = 0 } = request.query as {
      workspaceId: string;
      channelId?: string;
      uploaderId?: string;
      mimeType?: string;
      limit?: number;
      offset?: number;
    };

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

    let conditions = [eq(files.workspaceId, workspaceId), eq(files.status, "confirmed")];
    if (channelId) conditions.push(eq(files.channelId, channelId));
    if (uploaderId) conditions.push(eq(files.uploaderId, uploaderId));

    let query = db
      .select({
        id: files.id,
        filename: files.filename,
        mimeType: files.mimeType,
        size: files.size,
        channelId: files.channelId,
        messageId: files.messageId,
        width: files.width,
        height: files.height,
        createdAt: files.createdAt,
        uploader: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(files)
      .leftJoin(users, eq(files.uploaderId, users.id))
      .where(and(...conditions));

    const fileList = await query
      .orderBy(desc(files.createdAt))
      .limit(Math.min(Number(limit), 100))
      .offset(Number(offset));

    // Generate presigned download URLs for each file
    const filesWithUrls = await Promise.all(
      fileList.map(async (f) => {
        const [fullFile] = await db
          .select({ storageKey: files.storageKey })
          .from(files)
          .where(eq(files.id, f.id))
          .limit(1);

        const command = new GetObjectCommand({
          Bucket: MINIO_BUCKET,
          Key: fullFile.storageKey,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return { ...f, url };
      })
    );

    return reply.send({ data: filesWithUrls });
  });

  // GET /api/v1/files/:fileId - Get single file with download URL
  app.get("/:fileId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { fileId } = request.params as { fileId: string };

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return reply.status(404).send({ error: "File not found", statusCode: 404 });
    }

    // Check membership
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, file.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    // Get uploader info
    const [uploader] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, file.uploaderId))
      .limit(1);

    // Generate download URL
    const command = new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: file.storageKey,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 86400 });

    return reply.send({
      data: {
        ...file,
        url,
        uploader,
      },
    });
  });

  // DELETE /api/v1/files/:fileId - Delete file
  app.delete("/:fileId", async (request, reply) => {
    const db = (app as any).db;
    const { sub: userId } = request.user as { sub: string };
    const { fileId } = request.params as { fileId: string };

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return reply.status(404).send({ error: "File not found", statusCode: 404 });
    }

    // Check if uploader or admin
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, file.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
    }

    const isUploader = file.uploaderId === userId;
    const isAdmin = ["owner", "admin"].includes(member.role);

    if (!isUploader && !isAdmin) {
      return reply.status(403).send({ error: "Only uploader or admin can delete", statusCode: 403 });
    }

    // Delete from S3/MinIO
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: file.storageKey,
      }));
    } catch (err) {
      app.log.warn({ err, fileId }, "Failed to delete file from storage");
    }

    // Delete from database
    await db.delete(files).where(eq(files.id, fileId));

    return reply.send({ data: { deleted: true } });
  });
}
