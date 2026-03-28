// ─── Domain Entity Types ────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "member" | "guest" | "client";
export type ChannelType = "text" | "voice" | "announcement" | "client-portal";
export type MessageType = "text" | "system" | "file" | "decision";
export type WorkspacePlan = "community" | "plus" | "enterprise";

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
  status: "online" | "idle" | "dnd" | "offline";
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
  role: UserRole;
  joinedAt: string;
}

// ─── Channel ────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: ChannelType;
  isPrivate: boolean;
  isClientVisible: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
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
  content: string;
  type: MessageType;
  edited: boolean;
  editedAt: string | null;
  replyToId: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
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
  tags: string[];
  createdAt: string;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "message" | "file" | "channel" | "decision";
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
}

export interface AgentResponse {
  sessionId: string;
  reply: string;
  toolsUsed: string[];
  suggestions?: string[];
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export type GatewayEventType =
  | "message:create"
  | "message:update"
  | "message:delete"
  | "reaction:add"
  | "reaction:remove"
  | "channel:create"
  | "channel:update"
  | "channel:delete"
  | "presence:update"
  | "typing:start"
  | "typing:stop"
  | "decision:create";

export interface GatewayEvent<T = unknown> {
  type: GatewayEventType;
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
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
