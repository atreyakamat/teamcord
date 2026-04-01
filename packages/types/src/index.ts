// ─── Domain Entity Types ────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "member" | "guest" | "client";
export type ChannelType = "text" | "voice" | "video" | "stage" | "forum" | "announcement" | "client-portal";
export type MessageType = "text" | "system" | "file" | "decision" | "thread_starter";
export type WorkspacePlan = "community" | "plus" | "pro" | "enterprise";
export type PresenceStatus = "online" | "idle" | "dnd" | "offline";
export type ThreadStatus = "open" | "resolved" | "archived";

// Permission bits (Discord-compatible)
export const Permissions = {
  VIEW_CHANNEL: 1n << 0n,
  SEND_MESSAGES: 1n << 1n,
  SEND_TTS_MESSAGES: 1n << 2n,
  MANAGE_MESSAGES: 1n << 3n,
  EMBED_LINKS: 1n << 4n,
  ATTACH_FILES: 1n << 5n,
  READ_MESSAGE_HISTORY: 1n << 6n,
  MENTION_EVERYONE: 1n << 7n,
  USE_EXTERNAL_EMOJIS: 1n << 8n,
  ADD_REACTIONS: 1n << 9n,
  CONNECT: 1n << 10n,
  SPEAK: 1n << 11n,
  MUTE_MEMBERS: 1n << 12n,
  DEAFEN_MEMBERS: 1n << 13n,
  MOVE_MEMBERS: 1n << 14n,
  USE_VAD: 1n << 15n,
  PRIORITY_SPEAKER: 1n << 16n,
  STREAM: 1n << 17n,
  MANAGE_CHANNEL: 1n << 18n,
  MANAGE_ROLES: 1n << 19n,
  MANAGE_WEBHOOKS: 1n << 20n,
  MANAGE_WORKSPACE: 1n << 21n,
  CREATE_INSTANT_INVITE: 1n << 22n,
  KICK_MEMBERS: 1n << 23n,
  BAN_MEMBERS: 1n << 24n,
  ADMINISTRATOR: 1n << 25n,
  MANAGE_THREADS: 1n << 26n,
  CREATE_PUBLIC_THREADS: 1n << 27n,
  CREATE_PRIVATE_THREADS: 1n << 28n,
  SEND_MESSAGES_IN_THREADS: 1n << 29n,
  USE_SLASH_COMMANDS: 1n << 30n,
} as const;

// ─── User ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus: string | null;
  lastSeenAt: string;
}

// ─── Workspace ──────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  plan: WorkspacePlan;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  user?: User;
  role: UserRole;
  nickname?: string;
  roles?: string[]; // Role IDs
  joinedAt: string;
}

export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string; // BigInt as string
  isEveryone: boolean;
  mentionable: boolean;
  createdAt: string;
}

// ─── Channel ────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  topic?: string;
  type: ChannelType;
  isPrivate: boolean;
  isClientVisible: boolean;
  position: number;
  parentId?: string | null; // Category channel
  rateLimitPerUser?: number;
  lastMessageId?: string | null;
  permissionOverwrites?: PermissionOverwrite[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionOverwrite {
  id: string;
  channelId: string;
  targetId: string;
  targetType: "user" | "role";
  allow: string; // BigInt as string
  deny: string; // BigInt as string
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  lastReadMessageId: string | null;
  joinedAt: string;
}

// ─── Message ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  author?: User;
  content: string;
  type: MessageType;
  edited: boolean;
  editedAt: string | null;
  replyToId: string | null;
  replyTo?: Message;
  threadId?: string | null;
  attachments: Attachment[];
  reactions: ReactionSummary[];
  embeds?: Embed[];
  mentions?: string[]; // User IDs
  mentionRoles?: string[]; // Role IDs
  pinned?: boolean;
  flags?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  proxyUrl?: string;
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface ReactionSummary {
  emoji: string;
  emojiId?: string;
  emojiAnimated?: boolean;
  count: number;
  userIds: string[];
  me?: boolean; // Current user reacted
}

export interface Reaction {
  messageId: string;
  userId: string;
  emojiId: string | null;
  emojiName: string;
  emojiAnimated: boolean;
  createdAt: string;
}

export interface Embed {
  type: "rich" | "image" | "video" | "link";
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; iconUrl?: string };
  image?: { url: string; width?: number; height?: number };
  thumbnail?: { url: string; width?: number; height?: number };
  author?: { name: string; url?: string; iconUrl?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

// ─── Threads ────────────────────────────────────────────────────────────────

export interface Thread {
  id: string;
  channelId: string;
  name: string;
  creatorId: string;
  creator?: User;
  parentMessageId: string;
  status: ThreadStatus;
  messageCount: number;
  memberCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ThreadMember {
  threadId: string;
  userId: string;
  user?: User;
  lastReadMessageId: string | null;
  joinedAt: string;
}

// ─── Voice ──────────────────────────────────────────────────────────────────

export interface VoiceState {
  userId: string;
  user?: User;
  workspaceId: string;
  channelId: string | null;
  sessionId: string;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
  selfStream: boolean;
  updatedAt: string;
}

export interface VoiceRegion {
  id: string;
  name: string;
  optimal: boolean;
  deprecated: boolean;
}

// ─── Decision Log ───────────────────────────────────────────────────────────

export interface Decision {
  id: string;
  workspaceId: string;
  channelId: string;
  messageId: string;
  title: string;
  summary: string;
  decidedBy: string[];
  alternatives?: string[];
  outcome?: string;
  tags: string[];
  createdAt: string;
  createdBy?: string;
}

// ─── Wiki ───────────────────────────────────────────────────────────────────

export interface WikiPage {
  id: string;
  channelId: string;
  title: string;
  content: string;
  version: number;
  isAutoGenerated: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageHistory {
  id: string;
  wikiPageId: string;
  content: string;
  version: number;
  editedBy: string;
  editedAt: string;
}

// ─── Invites ────────────────────────────────────────────────────────────────

export interface Invite {
  id: string; // Short code
  workspaceId: string;
  workspace?: Workspace;
  channelId: string | null;
  channel?: Channel;
  creatorId: string;
  creator?: User;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
}

// ─── Files ──────────────────────────────────────────────────────────────────

export interface FileRecord {
  id: string;
  workspaceId: string;
  uploaderId: string;
  uploader?: User;
  channelId: string | null;
  messageId: string | null;
  filename: string;
  mimetype: string;
  sizeBytes: number;
  storageKey: string;
  width: number | null;
  height: number | null;
  thumbnailKey: string | null;
  uploadedAt: string;
}

export interface FileUploadRequest {
  filename: string;
  mimetype: string;
  sizeBytes: number;
  channelId?: string;
}

export interface FileUploadResponse {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "message" | "file" | "channel" | "decision" | "thread" | "wiki";
  id: string;
  score: number;
  highlight: string;
  channelId: string;
  channelName: string;
  authorId?: string;
  authorName?: string;
  createdAt: string;
}

export interface SearchQuery {
  q: string;
  workspaceId: string;
  channelIds?: string[];
  authorIds?: string[];
  after?: string;
  before?: string;
  type?: SearchResult["type"];
  limit?: number;
  offset?: number;
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export type AuditAction =
  | "workspace_create"
  | "workspace_update"
  | "workspace_delete"
  | "channel_create"
  | "channel_update"
  | "channel_delete"
  | "member_join"
  | "member_leave"
  | "member_kick"
  | "member_ban"
  | "member_role_update"
  | "message_delete"
  | "message_pin"
  | "message_unpin"
  | "invite_create"
  | "invite_delete"
  | "decision_create"
  | "decision_delete"
  | "wiki_update";

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  actionType: AuditAction;
  targetId: string | null;
  targetType: string | null;
  actorId: string;
  actor?: User;
  changes: Record<string, { old?: unknown; new?: unknown }>;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Client Portal ──────────────────────────────────────────────────────────

export interface ClientPortal {
  id: string;
  workspaceId: string;
  clientEmail: string;
  clientName: string;
  accessibleChannelIds: string[];
  inviteToken: string;
  expiresAt: string | null;
  createdAt: string;
}

// ─── AI Agent ───────────────────────────────────────────────────────────────

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentRequest {
  sessionId: string;
  workspaceId: string;
  channelId: string;
  userId: string;
  messages: AgentMessage[];
  context?: AgentContext;
}

export interface AgentContext {
  recentMessages?: Message[];
  decisions?: Decision[];
  channelInfo?: Channel;
  threadInfo?: Thread;
  wikiPage?: WikiPage;
}

export interface AgentResponse {
  sessionId: string;
  reply: string;
  toolsUsed: string[];
  suggestions?: string[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

// ─── WebSocket Gateway ──────────────────────────────────────────────────────

// Discord-compatible opcodes
export enum GatewayOpcode {
  DISPATCH = 0,          // Server → Client: Event dispatch
  HEARTBEAT = 1,         // Client → Server: Heartbeat
  IDENTIFY = 2,          // Client → Server: Identify
  PRESENCE_UPDATE = 3,   // Client → Server: Update presence
  VOICE_STATE_UPDATE = 4,// Client → Server: Voice state update
  RESUME = 6,            // Client → Server: Resume session
  RECONNECT = 7,         // Server → Client: Request reconnect
  REQUEST_MEMBERS = 8,   // Client → Server: Request guild members
  INVALID_SESSION = 9,   // Server → Client: Session invalidated
  HELLO = 10,            // Server → Client: Hello (contains heartbeat_interval)
  HEARTBEAT_ACK = 11,    // Server → Client: Heartbeat acknowledged
  // Nexus extensions (100+)
  SUBSCRIBE = 100,       // Client → Server: Subscribe to channel
  UNSUBSCRIBE = 101,     // Client → Server: Unsubscribe from channel
  TYPING = 102,          // Client → Server: Typing indicator
}

export type GatewayEventType =
  // Messages
  | "MESSAGE_CREATE"
  | "MESSAGE_UPDATE"
  | "MESSAGE_DELETE"
  | "MESSAGE_DELETE_BULK"
  | "MESSAGE_REACTION_ADD"
  | "MESSAGE_REACTION_REMOVE"
  | "MESSAGE_REACTION_REMOVE_ALL"
  // Channels
  | "CHANNEL_CREATE"
  | "CHANNEL_UPDATE"
  | "CHANNEL_DELETE"
  | "CHANNEL_PINS_UPDATE"
  // Threads
  | "THREAD_CREATE"
  | "THREAD_UPDATE"
  | "THREAD_DELETE"
  | "THREAD_MEMBER_UPDATE"
  // Presence
  | "PRESENCE_UPDATE"
  | "TYPING_START"
  // Voice
  | "VOICE_STATE_UPDATE"
  | "VOICE_SERVER_UPDATE"
  // Workspace
  | "WORKSPACE_UPDATE"
  | "WORKSPACE_DELETE"
  | "WORKSPACE_MEMBER_ADD"
  | "WORKSPACE_MEMBER_UPDATE"
  | "WORKSPACE_MEMBER_REMOVE"
  | "WORKSPACE_ROLE_CREATE"
  | "WORKSPACE_ROLE_UPDATE"
  | "WORKSPACE_ROLE_DELETE"
  // Session
  | "READY"
  | "RESUMED"
  // Nexus extensions
  | "DECISION_CREATE"
  | "DECISION_DELETE"
  | "WIKI_UPDATE"
  | "AI_AGENT_TYPING"
  | "AI_AGENT_RESPONSE";

// Gateway payload structures
export interface GatewayPayload<T = unknown> {
  op: GatewayOpcode;
  d: T;
  s?: number; // Sequence number (only for DISPATCH)
  t?: GatewayEventType; // Event type (only for DISPATCH)
}

export interface HelloPayload {
  heartbeat_interval: number;
}

export interface IdentifyPayload {
  token: string;
  properties: {
    os: string;
    browser: string;
    device: string;
  };
  compress?: boolean;
  presence?: PresenceUpdatePayload;
}

export interface PresenceUpdatePayload {
  status: PresenceStatus;
  customStatus?: string;
  afk?: boolean;
}

export interface VoiceStateUpdatePayload {
  workspaceId: string;
  channelId: string | null;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo?: boolean;
}

export interface ResumePayload {
  token: string;
  sessionId: string;
  seq: number;
}

export interface RequestMembersPayload {
  workspaceId: string;
  query?: string;
  limit?: number;
  userIds?: string[];
}

export interface ReadyPayload {
  sessionId: string;
  user: User;
  workspaces: WorkspaceWithState[];
  resumeGatewayUrl: string;
}

export interface WorkspaceWithState {
  workspace: Workspace;
  channels: Channel[];
  members: WorkspaceMember[];
  roles: Role[];
  presences: UserPresence[];
  voiceStates: VoiceState[];
}

// Legacy event format (for backwards compatibility)
export interface GatewayEvent<T = unknown> {
  type: string;
  payload: T;
  workspaceId: string;
  channelId?: string;
  timestamp: string;
}

// ─── API Response shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Cursor-based pagination (more efficient for large datasets)
export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

// ─── Read States ────────────────────────────────────────────────────────────

export interface ReadState {
  userId: string;
  channelId: string;
  lastReadMessageId: string | null;
  mentionCount: number;
  lastReadAt: string;
}
