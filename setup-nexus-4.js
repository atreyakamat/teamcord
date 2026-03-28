#!/usr/bin/env node
/**
 * Nexus API Routes Generator - Part 4: Channels, Messages, DMs
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

console.log('🚀 Nexus API Routes - Part 4\n');

writeFile('apps/api/src/routes/channels.ts', `import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createChannelSchema } from '../utils/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/channels/:id - Get channel details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        category: true,
      },
    });

    if (!channel) {
      throw new AppError(404, 'NOT_FOUND', 'Channel not found');
    }

    // Check workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    res.json({ success: true, data: channel });
  } catch (error) {
    next(error);
  }
});

// POST /api/channels - Create channel
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId, ...data } = createChannelSchema.extend({
      projectId: require('zod').z.string(),
    }).parse(req.body);

    // Get project and check workspace membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      throw new AppError(404, 'NOT_FOUND', 'Project not found');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: req.user!.id,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    // Check permissions (simplified - should check manage_channels)
    const hasPermission = membership.role.permissions.includes('administrator') ||
                          membership.role.permissions.includes('manage_channels');
    
    if (!hasPermission && project.workspace.ownerId !== req.user!.id) {
      throw new AppError(403, 'NO_PERMISSION', 'You do not have permission to create channels');
    }

    // Get max position
    const maxPosition = await prisma.channel.aggregate({
      where: { projectId },
      _max: { position: true },
    });

    const channel = await prisma.channel.create({
      data: {
        ...data,
        workspaceId: project.workspaceId,
        projectId,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/channels/:id - Update channel
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'NOT_FOUND', 'Channel not found');
    }

    // Check permissions
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: req.user!.id,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    const { name, topic, isPrivate, slowMode } = req.body;

    const updated = await prisma.channel.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(topic !== undefined && { topic }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(slowMode !== undefined && { slowMode }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/channels/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
    });

    if (!channel) {
      throw new AppError(404, 'NOT_FOUND', 'Channel not found');
    }

    // Check permissions
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: req.user!.id,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    const hasPermission = membership.role.permissions.includes('administrator') ||
                          membership.role.permissions.includes('manage_channels');

    if (!hasPermission) {
      throw new AppError(403, 'NO_PERMISSION', 'You do not have permission to delete channels');
    }

    await prisma.channel.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
`);

writeFile('apps/api/src/routes/messages.ts', `import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createMessageSchema, updateMessageSchema } from '../utils/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/messages/channel/:channelId - Get messages
router.get('/channel/:channelId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { channelId } = req.params;
    const { limit = '50', before, after } = req.query;
    
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new AppError(404, 'NOT_FOUND', 'Channel not found');
    }

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        threadId: null, // Only get non-thread messages
        ...(before && { createdAt: { lt: new Date(before as string) } }),
        ...(after && { createdAt: { gt: new Date(after as string) } }),
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
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, username: true },
            },
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
        startedThread: {
          select: {
            id: true,
            title: true,
            status: true,
            messageCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
    });

    // Transform reactions to grouped format
    const transformedMessages = messages.map(msg => ({
      ...msg,
      reactions: groupReactions(msg.reactions),
    }));

    res.json({ success: true, data: transformedMessages.reverse() });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/channel/:channelId - Send message
router.post('/channel/:channelId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { channelId } = req.params;
    const data = createMessageSchema.parse(req.body);
    
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new AppError(404, 'NOT_FOUND', 'Channel not found');
    }

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    // Check slow mode
    if (channel.slowMode > 0) {
      const lastMessage = await prisma.message.findFirst({
        where: {
          channelId,
          authorId: req.user!.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMessage) {
        const timeSince = Date.now() - lastMessage.createdAt.getTime();
        if (timeSince < channel.slowMode * 1000) {
          throw new AppError(429, 'SLOW_MODE', 
            \`Slow mode enabled. Wait \${Math.ceil((channel.slowMode * 1000 - timeSince) / 1000)} seconds.\`);
        }
      }
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        authorId: req.user!.id,
        content: data.content,
        type: data.replyToId ? 'reply' : 'default',
        replyToId: data.replyToId,
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

    res.status(201).json({ success: true, data: { ...message, reactions: [] } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/messages/:id - Edit message
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateMessageSchema.parse(req.body);
    
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      throw new AppError(404, 'NOT_FOUND', 'Message not found');
    }

    if (message.authorId !== req.user!.id) {
      throw new AppError(403, 'NOT_AUTHOR', 'You can only edit your own messages');
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: {
        content: data.content,
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
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { channel: true },
    });

    if (!message) {
      throw new AppError(404, 'NOT_FOUND', 'Message not found');
    }

    // Check if author or has manage_messages permission
    if (message.authorId !== req.user!.id) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: message.channel.workspaceId,
            userId: req.user!.id,
          },
        },
        include: { role: true },
      });

      const hasPermission = membership?.role.permissions.includes('administrator') ||
                            membership?.role.permissions.includes('manage_messages');

      if (!hasPermission) {
        throw new AppError(403, 'NO_PERMISSION', 'You cannot delete this message');
      }
    }

    await prisma.message.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/:id/reactions - Add reaction
router.post('/:id/reactions', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { emoji } = req.body;
    
    if (!emoji) {
      throw new AppError(400, 'MISSING_EMOJI', 'Emoji is required');
    }

    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { channel: true },
    });

    if (!message) {
      throw new AppError(404, 'NOT_FOUND', 'Message not found');
    }

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: message.channel.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    // Check if already reacted
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: req.params.id,
          userId: req.user!.id,
          emoji,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'ALREADY_REACTED', 'You have already reacted with this emoji');
    }

    await prisma.reaction.create({
      data: {
        messageId: req.params.id,
        userId: req.user!.id,
        emoji,
      },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/:id/reactions/:emoji - Remove reaction
router.delete('/:id/reactions/:emoji', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { emoji } = req.params;
    
    await prisma.reaction.deleteMany({
      where: {
        messageId: req.params.id,
        userId: req.user!.id,
        emoji: decodeURIComponent(emoji),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/:id/pin - Pin message
router.post('/:id/pin', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { channel: true },
    });

    if (!message) {
      throw new AppError(404, 'NOT_FOUND', 'Message not found');
    }

    await prisma.message.update({
      where: { id: req.params.id },
      data: { isPinned: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Helper function to group reactions
function groupReactions(reactions: any[]): { emoji: string; count: number; users: string[] }[] {
  const grouped: Record<string, { emoji: string; count: number; users: string[] }> = {};
  
  reactions.forEach(r => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.userId);
  });
  
  return Object.values(grouped);
}

export default router;
`);

writeFile('apps/api/src/routes/directMessages.ts', `import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/dm - Get user's DM channels
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const participations = await prisma.dMParticipant.findMany({
      where: { userId: req.user!.id },
      include: {
        channel: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { channel: { lastMessageAt: 'desc' } },
    });

    const channels = participations.map(p => ({
      ...p.channel,
      participants: p.channel.participants
        .map(pp => pp.user)
        .filter(u => u.id !== req.user!.id),
    }));

    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

// POST /api/dm - Create or get DM channel
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError(400, 'INVALID_USERS', 'At least one user ID is required');
    }

    // Filter out self
    const otherUserIds = userIds.filter((id: string) => id !== req.user!.id);
    if (otherUserIds.length === 0) {
      throw new AppError(400, 'INVALID_USERS', 'Cannot create DM with yourself');
    }

    const allUserIds = [req.user!.id, ...otherUserIds].sort();
    const isDM = allUserIds.length === 2;

    if (isDM) {
      // Check for existing DM between these two users
      const existing = await prisma.directMessageChannel.findFirst({
        where: {
          type: 'dm',
          participants: {
            every: {
              userId: { in: allUserIds },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (existing && existing.participants.length === 2) {
        res.json({
          success: true,
          data: {
            ...existing,
            participants: existing.participants
              .map(p => p.user)
              .filter(u => u.id !== req.user!.id),
          },
        });
        return;
      }
    }

    // Create new channel
    const channel = await prisma.directMessageChannel.create({
      data: {
        type: isDM ? 'dm' : 'group_dm',
        ownerId: isDM ? undefined : req.user!.id,
        participants: {
          create: allUserIds.map(userId => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...channel,
        participants: channel.participants
          .map(p => p.user)
          .filter(u => u.id !== req.user!.id),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dm/:id/messages - Get DM messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { limit = '50', before } = req.query;

    // Check participation
    const participation = await prisma.dMParticipant.findUnique({
      where: {
        channelId_userId: {
          channelId: req.params.id,
          userId: req.user!.id,
        },
      },
    });

    if (!participation) {
      throw new AppError(403, 'NOT_PARTICIPANT', 'You are not a participant in this conversation');
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        channelId: req.params.id,
        ...(before && { createdAt: { lt: new Date(before as string) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
    });

    // Get authors for messages
    const authorIds = [...new Set(messages.map(m => m.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

    const messagesWithAuthors = messages.map(m => ({
      ...m,
      author: authorMap[m.authorId],
    }));

    res.json({ success: true, data: messagesWithAuthors.reverse() });
  } catch (error) {
    next(error);
  }
});

// POST /api/dm/:id/messages - Send DM
router.post('/:id/messages', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { content } = req.body;

    if (!content || content.length === 0) {
      throw new AppError(400, 'MISSING_CONTENT', 'Message content is required');
    }

    // Check participation
    const participation = await prisma.dMParticipant.findUnique({
      where: {
        channelId_userId: {
          channelId: req.params.id,
          userId: req.user!.id,
        },
      },
    });

    if (!participation) {
      throw new AppError(403, 'NOT_PARTICIPANT', 'You are not a participant in this conversation');
    }

    const message = await prisma.directMessage.create({
      data: {
        channelId: req.params.id,
        authorId: req.user!.id,
        content,
      },
    });

    // Update lastMessageAt
    await prisma.directMessageChannel.update({
      where: { id: req.params.id },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({
      success: true,
      data: {
        ...message,
        author: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
`);

console.log('\n✅ Channels, Messages, and DM routes created!');
