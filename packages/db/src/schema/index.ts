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
  "announcement",
  "client-portal",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "system",
  "file",
  "decision",
]);

export const workspacePlanEnum = pgEnum("workspace_plan", [
  "community",
  "plus",
  "enterprise",
]);

export const presenceStatusEnum = pgEnum("presence_status", [
  "online",
  "idle",
  "dnd",
  "offline",
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
