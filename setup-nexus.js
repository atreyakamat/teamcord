#!/usr/bin/env node
/**
 * Nexus Complete Project Setup
 * This script generates the entire Nexus project with all source files
 * Run: node setup-nexus.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Helper to write file with directory creation
function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n');
  console.log('✓ ' + filePath);
}

console.log('🚀 Nexus Complete Setup\n');
console.log('Creating all project files...\n');

// =====================================================
// PACKAGES/SHARED
// =====================================================

writeFile('packages/shared/package.json', `{
  "name": "@nexus/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}`);

writeFile('packages/shared/tsconfig.json', `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}`);

writeFile('packages/shared/src/index.ts', `// ============================================
// Nexus Shared Types
// ============================================

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  customStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserProfile extends User {
  bio?: string;
  pronouns?: string;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  nickname?: string;
  joinedAt: Date;
}

// Project types (grouping layer inside workspace)
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// Channel types
export interface Channel {
  id: string;
  projectId: string;
  workspaceId: string;
  categoryId?: string;
  name: string;
  topic?: string;
  type: ChannelType;
  position: number;
  isPrivate: boolean;
  slowMode: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelType = 'text' | 'voice' | 'stage' | 'announcement';

// Category for organizing channels
export interface Category {
  id: string;
  projectId: string;
  name: string;
  position: number;
  collapsed: boolean;
}

// Message types
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  author?: User;
  content: string;
  type: MessageType;
  threadId?: string;
  replyToId?: string;
  replyTo?: Message;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  attachments: Attachment[];
  mentions: string[];
  reactions: Reaction[];
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 'default' | 'system' | 'reply' | 'thread_starter';

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

// Thread types
export interface Thread {
  id: string;
  channelId: string;
  parentMessageId: string;
  title?: string;
  status: ThreadStatus;
  ownerId: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ThreadStatus = 'open' | 'resolved' | 'archived';

// Direct Message types
export interface DirectMessageChannel {
  id: string;
  type: 'dm' | 'group_dm';
  participants: User[];
  name?: string;
  iconUrl?: string;
  ownerId?: string;
  lastMessageAt?: Date;
  createdAt: Date;
}

// Role and permissions
export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  permissions: Permission[];
  position: number;
  isDefault: boolean;
}

export type Permission =
  | 'read_messages'
  | 'send_messages'
  | 'manage_messages'
  | 'attach_files'
  | 'create_threads'
  | 'manage_threads'
  | 'add_reactions'
  | 'mention_everyone'
  | 'manage_channels'
  | 'manage_roles'
  | 'manage_members'
  | 'manage_workspace'
  | 'view_audit_log'
  | 'administrator';

// Voice types
export interface VoiceState {
  oderId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isCameraOn: boolean;
}

// Invite types
export interface Invite {
  id: string;
  code: string;
  workspaceId: string;
  channelId?: string;
  inviterId: string;
  maxUses?: number;
  uses: number;
  expiresAt?: Date;
  createdAt: Date;
}

// AI Agent types
export interface AgentCommand {
  type: 'summarise' | 'decide' | 'search' | 'run' | 'draft';
  channelId: string;
  userId: string;
  input: string;
  context?: string[];
}

export interface AgentResponse {
  id: string;
  commandType: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Decision {
  id: string;
  channelId: string;
  threadId?: string;
  title: string;
  summary: string;
  participants: string[];
  optionsConsidered: string[];
  outcome: string;
  rationale: string;
  decidedAt: Date;
  createdBy: string;
}

// WebSocket event types
export type ClientToServerEvents = {
  'message:send': (data: { channelId: string; content: string; replyToId?: string }) => void;
  'message:edit': (data: { messageId: string; content: string }) => void;
  'message:delete': (data: { messageId: string }) => void;
  'typing:start': (data: { channelId: string }) => void;
  'typing:stop': (data: { channelId: string }) => void;
  'presence:update': (data: { status: UserStatus }) => void;
  'channel:join': (data: { channelId: string }) => void;
  'channel:leave': (data: { channelId: string }) => void;
  'voice:join': (data: { channelId: string }) => void;
  'voice:leave': (data: { channelId: string }) => void;
  'voice:update': (data: Partial<VoiceState>) => void;
  'reaction:add': (data: { messageId: string; emoji: string }) => void;
  'reaction:remove': (data: { messageId: string; emoji: string }) => void;
};

export type ServerToClientEvents = {
  'message:created': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (data: { id: string; channelId: string }) => void;
  'typing:started': (data: { channelId: string; user: User }) => void;
  'typing:stopped': (data: { channelId: string; userId: string }) => void;
  'presence:updated': (data: { userId: string; status: UserStatus }) => void;
  'member:joined': (data: { channelId: string; user: User }) => void;
  'member:left': (data: { channelId: string; userId: string }) => void;
  'voice:userJoined': (data: { channelId: string; user: User }) => void;
  'voice:userLeft': (data: { channelId: string; userId: string }) => void;
  'voice:stateUpdated': (data: VoiceState) => void;
  'reaction:added': (data: { messageId: string; emoji: string; userId: string }) => void;
  'reaction:removed': (data: { messageId: string; emoji: string; userId: string }) => void;
  'channel:created': (channel: Channel) => void;
  'channel:updated': (channel: Channel) => void;
  'channel:deleted': (data: { id: string }) => void;
  'error': (data: { message: string; code?: string }) => void;
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

// Utility types
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constants
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_USERNAME_LENGTH = 32;
export const MAX_CHANNEL_NAME_LENGTH = 100;
export const MAX_WORKSPACE_NAME_LENGTH = 100;
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/pdf',
  'text/plain', 'text/markdown',
];`);

// =====================================================
// APPS/API
// =====================================================

writeFile('apps/api/package.json', `{
  "name": "@nexus/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@nexus/shared": "workspace:*",
    "@prisma/client": "^5.9.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "meilisearch": "^0.37.0",
    "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.4",
    "socket.io": "^4.7.4",
    "uuid": "^9.0.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "prisma": "^5.9.0",
    "tsc-alias": "^1.8.8",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}`);

writeFile('apps/api/tsconfig.json', `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`);

writeFile('apps/api/.env.example', `# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexus?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# AI (Optional)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=26214400

# Meilisearch (Optional)
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_API_KEY=""

# CORS
CORS_ORIGIN="http://localhost:5173"`);

writeFile('apps/api/prisma/schema.prisma', `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User Models
// ============================================

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  displayName  String
  passwordHash String
  avatarUrl    String?
  status       String   @default("offline")
  customStatus String?
  bio          String?
  pronouns     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  ownedWorkspaces  Workspace[]       @relation("WorkspaceOwner")
  memberships      WorkspaceMember[]
  messages         Message[]
  threads          Thread[]          @relation("ThreadOwner")
  invites          Invite[]
  reactions        Reaction[]
  refreshTokens    RefreshToken[]
  dmParticipations DMParticipant[]

  @@index([email])
  @@index([username])
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
}

// ============================================
// Workspace Models
// ============================================

model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  iconUrl     String?
  ownerId     String
  owner       User     @relation("WorkspaceOwner", fields: [ownerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  members   WorkspaceMember[]
  projects  Project[]
  roles     Role[]
  invites   Invite[]
  channels  Channel[]

  @@index([slug])
  @@index([ownerId])
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleId      String
  role        Role      @relation(fields: [roleId], references: [id])
  nickname    String?
  joinedAt    DateTime  @default(now())

  @@unique([workspaceId, userId])
  @@index([workspaceId])
  @@index([userId])
}

model Role {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name        String
  color       String   @default("#99AAB5")
  permissions String[] @default([])
  position    Int      @default(0)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members WorkspaceMember[]

  @@index([workspaceId])
}

// ============================================
// Project & Channel Models
// ============================================

model Project {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name        String
  description String?
  iconUrl     String?
  position    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  categories Category[]
  channels   Channel[]

  @@index([workspaceId])
}

model Category {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String
  position  Int      @default(0)
  collapsed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  channels Channel[]

  @@index([projectId])
}

model Channel {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  name        String
  topic       String?
  type        String    @default("text") // text, voice, stage, announcement
  position    Int       @default(0)
  isPrivate   Boolean   @default(false)
  slowMode    Int       @default(0) // seconds between messages
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  messages Message[]
  threads  Thread[]
  invites  Invite[]

  @@index([workspaceId])
  @@index([projectId])
  @@index([categoryId])
}

// ============================================
// Message Models
// ============================================

model Message {
  id          String   @id @default(cuid())
  channelId   String
  channel     Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  content     String
  type        String   @default("default") // default, system, reply, thread_starter
  threadId    String?
  thread      Thread?  @relation(fields: [threadId], references: [id], onDelete: SetNull)
  replyToId   String?
  replyTo     Message? @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies     Message[] @relation("MessageReplies")
  isPinned    Boolean  @default(false)
  isEdited    Boolean  @default(false)
  editedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attachments Attachment[]
  reactions   Reaction[]
  mentions    MessageMention[]

  // Thread started by this message
  startedThread Thread? @relation("ThreadStarter")

  @@index([channelId])
  @@index([authorId])
  @@index([threadId])
  @@index([createdAt])
}

model Attachment {
  id          String  @id @default(cuid())
  messageId   String
  message     Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  filename    String
  url         String
  contentType String
  size        Int
  createdAt   DateTime @default(now())

  @@index([messageId])
}

model Reaction {
  id        String  @id @default(cuid())
  messageId String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  emoji     String
  createdAt DateTime @default(now())

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}

model MessageMention {
  id            String  @id @default(cuid())
  messageId     String
  message       Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  mentionedId   String
  mentionType   String  @default("user") // user, role, everyone, here

  @@index([messageId])
  @@index([mentionedId])
}

// ============================================
// Thread Models
// ============================================

model Thread {
  id              String   @id @default(cuid())
  channelId       String
  channel         Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  parentMessageId String   @unique
  parentMessage   Message  @relation("ThreadStarter", fields: [parentMessageId], references: [id], onDelete: Cascade)
  title           String?
  status          String   @default("open") // open, resolved, archived
  ownerId         String
  owner           User     @relation("ThreadOwner", fields: [ownerId], references: [id])
  messageCount    Int      @default(0)
  lastMessageAt   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  messages Message[]

  @@index([channelId])
  @@index([ownerId])
}

// ============================================
// Direct Message Models
// ============================================

model DirectMessageChannel {
  id            String   @id @default(cuid())
  type          String   @default("dm") // dm, group_dm
  name          String?  // For group DMs
  iconUrl       String?
  ownerId       String?  // For group DMs
  lastMessageAt DateTime @default(now())
  createdAt     DateTime @default(now())

  participants  DMParticipant[]
  messages      DirectMessage[]
}

model DMParticipant {
  id        String              @id @default(cuid())
  channelId String
  channel   DirectMessageChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  userId    String
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt  DateTime            @default(now())

  @@unique([channelId, userId])
  @@index([channelId])
  @@index([userId])
}

model DirectMessage {
  id        String              @id @default(cuid())
  channelId String
  channel   DirectMessageChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  authorId  String
  content   String
  isEdited  Boolean             @default(false)
  editedAt  DateTime?
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@index([channelId])
  @@index([authorId])
  @@index([createdAt])
}

// ============================================
// Invite Models
// ============================================

model Invite {
  id          String    @id @default(cuid())
  code        String    @unique
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  channelId   String?
  channel     Channel?  @relation(fields: [channelId], references: [id], onDelete: SetNull)
  inviterId   String
  inviter     User      @relation(fields: [inviterId], references: [id])
  maxUses     Int?
  uses        Int       @default(0)
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())

  @@index([code])
  @@index([workspaceId])
}

// ============================================
// Audit Log
// ============================================

model AuditLog {
  id          String   @id @default(cuid())
  workspaceId String
  actorId     String
  action      String
  targetType  String
  targetId    String
  changes     Json?
  createdAt   DateTime @default(now())

  @@index([workspaceId])
  @@index([actorId])
  @@index([createdAt])
}`);

// Continue in next part due to size...
console.log('\n📄 Created shared package and API package.json/prisma...');
