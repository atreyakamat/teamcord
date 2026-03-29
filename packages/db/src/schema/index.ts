import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "member",
  "guest",
  "client",
]);

export const channelTypeEnum = pgEnum("channel_type", [
  "text",
  "voice",
  "video",
  "stage",
  "forum",
  "announcement",
  "client-portal",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "system",
  "file",
  "decision",
  "thread_starter",
]);

export const workspacePlanEnum = pgEnum("workspace_plan", [
  "community",
  "plus",
  "pro",
  "enterprise",
]);

export const presenceStatusEnum = pgEnum("presence_status", [
  "online",
  "idle",
  "dnd",
  "offline",
]);

export const threadStatusEnum = pgEnum("thread_status", [
  "open",
  "resolved",
  "archived",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "workspace_create",
  "workspace_update",
  "workspace_delete",
  "channel_create",
  "channel_update",
  "channel_delete",
  "member_join",
  "member_leave",
  "member_kick",
  "member_ban",
  "member_role_update",
  "message_delete",
  "message_pin",
  "message_unpin",
  "invite_create",
  "invite_delete",
  "decision_create",
  "decision_delete",
  "wiki_update",
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_username_idx").on(t.username),
  ]
);

export const userPresence = pgTable("user_presence", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: presenceStatusEnum("status").notNull().default("offline"),
  customStatus: text("custom_status"),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

// ─── Workspaces ──────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  iconUrl: text("icon_url"),
  plan: workspacePlanEnum("plan").notNull().default("community"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    index("workspace_members_workspace_idx").on(t.workspaceId),
    index("workspace_members_user_idx").on(t.userId),
  ]
);

// ─── Channels ────────────────────────────────────────────────────────────────

export const channels = pgTable(
  "channels",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: channelTypeEnum("type").notNull().default("text"),
    isPrivate: boolean("is_private").notNull().default(false),
    isClientVisible: boolean("is_client_visible").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("channels_workspace_idx").on(t.workspaceId)]
);

export const channelMembers = pgTable(
  "channel_members",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    index("channel_members_channel_idx").on(t.channelId),
    index("channel_members_user_idx").on(t.userId),
  ]
);

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    type: messageTypeEnum("type").notNull().default("text"),
    edited: boolean("edited").notNull().default(false),
    editedAt: timestamp("edited_at"),
    replyToId: text("reply_to_id"),
    attachments: jsonb("attachments").notNull().default(sql`'[]'::jsonb`),
    reactions: jsonb("reactions").notNull().default(sql`'[]'::jsonb`),
    searchVector: text("search_vector"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("messages_channel_idx").on(t.channelId),
    index("messages_author_idx").on(t.authorId),
    index("messages_created_at_idx").on(t.createdAt),
  ]
);

// ─── Decisions ───────────────────────────────────────────────────────────────

export const decisions = pgTable(
  "decisions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    decidedBy: jsonb("decided_by").notNull().default(sql`'[]'::jsonb`),
    tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("decisions_workspace_idx").on(t.workspaceId),
    index("decisions_channel_idx").on(t.channelId),
  ]
);

// ─── Client Portals ──────────────────────────────────────────────────────────

export const clientPortals = pgTable(
  "client_portals",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientEmail: text("client_email").notNull(),
    clientName: text("client_name").notNull(),
    accessibleChannelIds: jsonb("accessible_channel_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    inviteToken: text("invite_token").notNull().unique(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("client_portals_workspace_idx").on(t.workspaceId),
    uniqueIndex("client_portals_token_idx").on(t.inviteToken),
  ]
);

// ─── Threads ─────────────────────────────────────────────────────────────────

export const threads = pgTable(
  "threads",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    parentMessageId: text("parent_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    status: threadStatusEnum("status").notNull().default("open"),
    messageCount: integer("message_count").notNull().default(0),
    memberCount: integer("member_count").notNull().default(1),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("threads_channel_idx").on(t.channelId),
    index("threads_status_idx").on(t.status),
    index("threads_parent_message_idx").on(t.parentMessageId),
  ]
);

export const threadMembers = pgTable(
  "thread_members",
  {
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.userId] }),
    index("thread_members_thread_idx").on(t.threadId),
    index("thread_members_user_idx").on(t.userId),
  ]
);

// ─── Reactions ───────────────────────────────────────────────────────────────

export const reactions = pgTable(
  "reactions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emojiId: text("emoji_id"), // Custom emoji ID (null for unicode)
    emojiName: text("emoji_name").notNull(), // Unicode emoji or custom name
    emojiAnimated: boolean("emoji_animated").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.userId, t.emojiName] }),
    index("reactions_message_idx").on(t.messageId),
    index("reactions_user_idx").on(t.userId),
  ]
);

// ─── Pinned Messages ─────────────────────────────────────────────────────────

export const pinnedMessages = pgTable(
  "pinned_messages",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    pinnedBy: text("pinned_by")
      .notNull()
      .references(() => users.id),
    pinnedAt: timestamp("pinned_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.messageId] }),
    index("pinned_messages_channel_idx").on(t.channelId),
  ]
);

// ─── Voice States ────────────────────────────────────────────────────────────

export const voiceStates = pgTable(
  "voice_states",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: text("channel_id")
      .references(() => channels.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    selfMute: boolean("self_mute").notNull().default(false),
    selfDeaf: boolean("self_deaf").notNull().default(false),
    selfVideo: boolean("self_video").notNull().default(false),
    selfStream: boolean("self_stream").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("voice_states_channel_idx").on(t.channelId),
    index("voice_states_user_idx").on(t.userId),
    uniqueIndex("voice_states_session_idx").on(t.sessionId),
  ]
);

// ─── Wiki Pages ──────────────────────────────────────────────────────────────

export const wikiPages = pgTable(
  "wiki_pages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    version: integer("version").notNull().default(1),
    isAutoGenerated: boolean("is_auto_generated").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("wiki_pages_channel_idx").on(t.channelId),
  ]
);

export const wikiPageHistory = pgTable(
  "wiki_page_history",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    wikiPageId: text("wiki_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    version: integer("version").notNull(),
    editedBy: text("edited_by")
      .notNull()
      .references(() => users.id),
    editedAt: timestamp("edited_at").notNull().defaultNow(),
  },
  (t) => [
    index("wiki_page_history_page_idx").on(t.wikiPageId),
  ]
);

// ─── Invites ─────────────────────────────────────────────────────────────────

export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey(), // Short code (8 chars)
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: text("channel_id")
      .references(() => channels.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    maxUses: integer("max_uses"), // null = unlimited
    uses: integer("uses").notNull().default(0),
    expiresAt: timestamp("expires_at"), // null = never
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("invites_workspace_idx").on(t.workspaceId),
  ]
);

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actionType: auditActionEnum("action_type").notNull(),
    targetId: text("target_id"), // ID of affected entity
    targetType: text("target_type"), // Type of affected entity (user, channel, message, etc.)
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    changes: jsonb("changes").default(sql`'{}'::jsonb`), // Before/after values
    reason: text("reason"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Additional context
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_workspace_idx").on(t.workspaceId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_idx").on(t.createdAt),
    index("audit_log_action_idx").on(t.actionType),
  ]
);

// ─── Files ───────────────────────────────────────────────────────────────────

export const files = pgTable(
  "files",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => users.id),
    channelId: text("channel_id")
      .references(() => channels.id, { onDelete: "set null" }),
    messageId: text("message_id")
      .references(() => messages.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    mimetype: text("mimetype").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(), // MinIO object key
    width: integer("width"), // For images
    height: integer("height"), // For images
    thumbnailKey: text("thumbnail_key"), // MinIO key for thumbnail
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  },
  (t) => [
    index("files_workspace_idx").on(t.workspaceId),
    index("files_channel_idx").on(t.channelId),
    index("files_uploader_idx").on(t.uploaderId),
  ]
);

// ─── Message Embeddings (for semantic search) ────────────────────────────────

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    messageId: text("message_id")
      .primaryKey()
      .references(() => messages.id, { onDelete: "cascade" }),
    // Note: vector type requires pgvector extension
    // embedding: vector("embedding", { dimensions: 768 }),
    embeddingData: jsonb("embedding_data").notNull(), // Fallback: store as JSON array
    modelName: text("model_name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("message_embeddings_message_idx").on(t.messageId),
  ]
);

// ─── Typing Indicators (Redis-backed, but track for rate limiting) ──────────

export const typingIndicators = pgTable(
  "typing_indicators",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
    index("typing_indicators_channel_idx").on(t.channelId),
    index("typing_indicators_expires_idx").on(t.expiresAt),
  ]
);

// ─── Read States (for unread counts) ─────────────────────────────────────────

export const readStates = pgTable(
  "read_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    mentionCount: integer("mention_count").notNull().default(0),
    lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.channelId] }),
    index("read_states_user_idx").on(t.userId),
    index("read_states_channel_idx").on(t.channelId),
  ]
);

// ─── Permissions (granular channel overwrites) ───────────────────────────────

export const permissionOverwrites = pgTable(
  "permission_overwrites",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    targetId: text("target_id").notNull(), // User ID or Role ID
    targetType: text("target_type").notNull(), // "user" or "role"
    allow: bigint("allow", { mode: "number" }).notNull().default(0), // Allowed permission bits
    deny: bigint("deny", { mode: "number" }).notNull().default(0), // Denied permission bits
  },
  (t) => [
    index("permission_overwrites_channel_idx").on(t.channelId),
    uniqueIndex("permission_overwrites_unique_idx").on(t.channelId, t.targetId, t.targetType),
  ]
);

// ─── Roles (workspace-level) ─────────────────────────────────────────────────

export const roles = pgTable(
  "roles",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"), // Hex color code
    position: integer("position").notNull().default(0),
    permissions: bigint("permissions", { mode: "number" }).notNull().default(0), // Permission bitmask
    isEveryone: boolean("is_everyone").notNull().default(false),
    mentionable: boolean("mentionable").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("roles_workspace_idx").on(t.workspaceId),
  ]
);

// ─── Member Roles (many-to-many) ─────────────────────────────────────────────

export const memberRoles = pgTable(
  "member_roles",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId, t.roleId] }),
    index("member_roles_workspace_user_idx").on(t.workspaceId, t.userId),
  ]
);
