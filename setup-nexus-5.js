#!/usr/bin/env node
/**
 * Nexus WebSocket & Services - Part 5
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n');
  console.log('✓ ' + filePath);
}

console.log('🚀 Nexus WebSocket & Services\n');

writeFile('apps/api/src/websocket/index.ts', `import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Message, UserStatus } from '@nexus/shared';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  username?: string;
}

// Track which users are in which channels
const channelUsers = new Map<string, Set<string>>();
// Track user sockets
const userSockets = new Map<string, Set<string>>();
// Track typing users
const typingUsers = new Map<string, Set<string>>();

export function setupWebSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(\`User connected: \${socket.username} (\${userId})\`);

    // Track socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Update user status to online
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'online' },
    });

    // Broadcast presence
    socket.broadcast.emit('presence:updated', { userId, status: 'online' });

    // Join channel room
    socket.on('channel:join', async ({ channelId }) => {
      socket.join(\`channel:\${channelId}\`);
      
      if (!channelUsers.has(channelId)) {
        channelUsers.set(channelId, new Set());
      }
      channelUsers.get(channelId)!.add(userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (user) {
        socket.to(\`channel:\${channelId}\`).emit('member:joined', { channelId, user });
      }
    });

    // Leave channel room
    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(\`channel:\${channelId}\`);
      channelUsers.get(channelId)?.delete(userId);
      socket.to(\`channel:\${channelId}\`).emit('member:left', { channelId, userId });
    });

    // Send message
    socket.on('message:send', async ({ channelId, content, replyToId }) => {
      try {
        // Verify channel access
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
        });

        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: channel.workspaceId,
              userId,
            },
          },
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a workspace member' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            channelId,
            authorId: userId,
            content,
            type: replyToId ? 'reply' : 'default',
            replyToId,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            replyTo: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        });

        // Broadcast to channel
        io.to(\`channel:\${channelId}\`).emit('message:created', {
          ...message,
          reactions: [],
          attachments: [],
          mentions: [],
        } as Message);

        // Stop typing
        typingUsers.get(channelId)?.delete(userId);
      } catch (error) {
        logger.error(\`Error sending message: \${error}\`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('message:edit', async ({ messageId, content }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message || message.authorId !== userId) {
          socket.emit('error', { message: 'Cannot edit this message' });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: {
            content,
            isEdited: true,
            editedAt: new Date(),
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            reactions: true,
            attachments: true,
          },
        });

        io.to(\`channel:\${message.channelId}\`).emit('message:updated', updated as Message);
      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('message:delete', async ({ messageId }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user is author or has permission
        if (message.authorId !== userId) {
          const channel = await prisma.channel.findUnique({
            where: { id: message.channelId },
          });
          
          const membership = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: channel!.workspaceId,
                userId,
              },
            },
            include: { role: true },
          });

          const canDelete = membership?.role.permissions.includes('administrator') ||
                           membership?.role.permissions.includes('manage_messages');

          if (!canDelete) {
            socket.emit('error', { message: 'Cannot delete this message' });
            return;
          }
        }

        await prisma.message.delete({ where: { id: messageId } });

        io.to(\`channel:\${message.channelId}\`).emit('message:deleted', {
          id: messageId,
          channelId: message.channelId,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Typing indicators
    socket.on('typing:start', async ({ channelId }) => {
      if (!typingUsers.has(channelId)) {
        typingUsers.set(channelId, new Set());
      }
      typingUsers.get(channelId)!.add(userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (user) {
        socket.to(\`channel:\${channelId}\`).emit('typing:started', { channelId, user });
      }
    });

    socket.on('typing:stop', ({ channelId }) => {
      typingUsers.get(channelId)?.delete(userId);
      socket.to(\`channel:\${channelId}\`).emit('typing:stopped', { channelId, userId });
    });

    // Presence update
    socket.on('presence:update', async ({ status }) => {
      await prisma.user.update({
        where: { id: userId },
        data: { status },
      });

      socket.broadcast.emit('presence:updated', { userId, status });
    });

    // Reactions
    socket.on('reaction:add', async ({ messageId, emoji }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message) return;

        await prisma.reaction.upsert({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
          create: { messageId, userId, emoji },
          update: {},
        });

        io.to(\`channel:\${message.channelId}\`).emit('reaction:added', {
          messageId,
          emoji,
          userId,
        });
      } catch (error) {
        // Ignore duplicate reactions
      }
    });

    socket.on('reaction:remove', async ({ messageId, emoji }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message) return;

        await prisma.reaction.deleteMany({
          where: { messageId, userId, emoji },
        });

        io.to(\`channel:\${message.channelId}\`).emit('reaction:removed', {
          messageId,
          emoji,
          userId,
        });
      } catch (error) {
        // Ignore
      }
    });

    // Voice channel events
    socket.on('voice:join', async ({ channelId }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (user) {
        socket.join(\`voice:\${channelId}\`);
        io.to(\`channel:\${channelId}\`).emit('voice:userJoined', { channelId, user });
      }
    });

    socket.on('voice:leave', ({ channelId }) => {
      socket.leave(\`voice:\${channelId}\`);
      io.to(\`channel:\${channelId}\`).emit('voice:userLeft', { channelId, userId });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      logger.info(\`User disconnected: \${socket.username}\`);

      // Remove socket from tracking
      userSockets.get(userId)?.delete(socket.id);

      // If no more sockets for this user, mark offline
      if (userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId);
        
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'offline' },
        });

        socket.broadcast.emit('presence:updated', { userId, status: 'offline' });
      }

      // Clean up channel tracking
      channelUsers.forEach((users, channelId) => {
        if (users.has(userId)) {
          users.delete(userId);
        }
      });

      // Clean up typing
      typingUsers.forEach((users, channelId) => {
        if (users.has(userId)) {
          users.delete(userId);
          socket.to(\`channel:\${channelId}\`).emit('typing:stopped', { channelId, userId });
        }
      });
    });
  });

  return io;
}
`);

writeFile('apps/api/src/services/ai.ts', `import type { AgentCommand, AgentResponse } from '@nexus/shared';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

// AI Service - supports OpenAI and Anthropic
// Configure via environment variables

interface AIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
}

function getConfig(): AIConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229',
    };
  }
  return null;
}

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const config = getConfig()!;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${config.apiKey}\`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

async function callAnthropic(prompt: string, systemPrompt: string): Promise<string> {
  const config = getConfig()!;
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return data.content[0]?.text || 'No response generated.';
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const config = getConfig();
  if (!config) {
    return 'AI is not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.';
  }

  if (config.provider === 'openai') {
    return callOpenAI(prompt, systemPrompt);
  } else {
    return callAnthropic(prompt, systemPrompt);
  }
}

export async function processAgentCommand(command: AgentCommand): Promise<AgentResponse> {
  const { type, channelId, userId, input, context } = command;
  
  logger.info(\`Processing agent command: \${type} from user \${userId}\`);

  let response: string;
  let metadata: Record<string, unknown> = {};

  switch (type) {
    case 'summarise': {
      const systemPrompt = \`You are a helpful assistant that summarizes conversations. 
        Provide a clear, structured summary with:
        - Key points discussed
        - Decisions made (if any)
        - Action items (if any)
        Keep it concise but comprehensive.\`;
      
      const contextText = context?.join('\\n') || '';
      const prompt = input || \`Please summarize this conversation:\\n\\n\${contextText}\`;
      
      response = await callAI(prompt, systemPrompt);
      break;
    }

    case 'decide': {
      const systemPrompt = \`You are a decision logger. Extract and format decision information:
        - What was decided
        - Who participated in the decision
        - What alternatives were considered
        - The rationale for the decision
        Format as a clear decision log entry.\`;
      
      const contextText = context?.join('\\n') || '';
      const prompt = input || \`Extract the decision from this conversation:\\n\\n\${contextText}\`;
      
      response = await callAI(prompt, systemPrompt);
      
      // Could parse and store in Decision table
      metadata = { type: 'decision' };
      break;
    }

    case 'search': {
      // For now, just acknowledge - real implementation would use SearXNG or web API
      response = \`Search functionality coming soon. You searched for: "\${input}"\`;
      break;
    }

    case 'run': {
      // Code execution - needs sandboxing, disabled for safety
      response = 'Code execution is not enabled in this instance for security reasons.';
      break;
    }

    case 'draft': {
      const systemPrompt = \`You are a helpful writing assistant. Draft content based on the user's request.
        Match the tone and style appropriate for a professional team communication platform.
        Be concise but thorough.\`;
      
      response = await callAI(input, systemPrompt);
      break;
    }

    default:
      response = \`Unknown command: \${type}\`;
  }

  return {
    id: \`agent-\${Date.now()}\`,
    commandType: type,
    content: response,
    metadata,
    createdAt: new Date(),
  };
}

// Parse @agent mentions in messages
export function parseAgentMention(content: string): { hasAgentMention: boolean; query: string } {
  const agentMatch = content.match(/@agent\\s+(.+)/i);
  if (agentMatch) {
    return { hasAgentMention: true, query: agentMatch[1].trim() };
  }
  return { hasAgentMention: false, query: '' };
}

// Parse slash commands
export function parseSlashCommand(content: string): { command: string; args: string } | null {
  const match = content.match(/^\\/([a-z]+)(?:\\s+(.*))?$/i);
  if (match) {
    return { command: match[1].toLowerCase(), args: match[2] || '' };
  }
  return null;
}
`);

console.log('\n✅ WebSocket and AI services created!');
