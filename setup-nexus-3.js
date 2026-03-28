#!/usr/bin/env node
/**
 * Nexus API Routes Generator - Part 3
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

console.log('🚀 Nexus API Routes\n');

// =====================================================
// API - Routes
// =====================================================

writeFile('apps/api/src/routes/auth.ts', `import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { prisma } from '../utils/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  getTokenExpiresIn 
} from '../utils/jwt.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res: Response, next) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if email or username already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (existing) {
      throw new AppError(409, 'CONFLICT', 
        existing.email === data.email 
          ? 'Email already registered' 
          : 'Username already taken'
      );
    }

    const passwordHash = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName || data.username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: getTokenExpiresIn(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res: Response, next) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    res.json({
      success: true,
      data: {
        user: authUser,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: getTokenExpiresIn(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res: Response, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError(400, 'MISSING_TOKEN', 'Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token has expired');
    }

    const user = storedToken.user;
    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };

    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(authUser);

    // Delete old token and create new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: getTokenExpiresIn(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Update user status
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { status: 'offline' },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

export default router;
`);

writeFile('apps/api/src/routes/users.ts', `import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  pronouns: z.string().max(50).optional(),
  status: z.enum(['online', 'idle', 'dnd', 'offline']).optional(),
  customStatus: z.string().max(100).optional(),
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        customStatus: true,
        bio: true,
        pronouns: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/me
router.patch('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        customStatus: true,
        bio: true,
        pronouns: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/search
router.get('/search', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        NOT: { id: req.user!.id },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
      take: 10,
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

export default router;
`);

writeFile('apps/api/src/routes/workspaces.ts', `import { Router, Response } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createWorkspaceSchema } from '../utils/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/workspaces - Get user's workspaces
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true } },
          },
        },
        role: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      memberCount: m.workspace._count.members,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.json({ success: true, data: workspaces });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces - Create workspace
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);
    
    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + nanoid(6);

    // Check if slug exists
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new AppError(409, 'SLUG_EXISTS', 'This workspace URL is already taken');
    }

    // Create workspace with default role and project
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ownerId: req.user!.id,
        },
      });

      // Create admin role
      const adminRole = await tx.role.create({
        data: {
          workspaceId: ws.id,
          name: 'Admin',
          color: '#E74C3C',
          permissions: ['administrator'],
          position: 100,
          isDefault: false,
        },
      });

      // Create member role (default)
      const memberRole = await tx.role.create({
        data: {
          workspaceId: ws.id,
          name: 'Member',
          color: '#99AAB5',
          permissions: ['read_messages', 'send_messages', 'attach_files', 'add_reactions', 'create_threads'],
          position: 0,
          isDefault: true,
        },
      });

      // Add owner as admin
      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: req.user!.id,
          roleId: adminRole.id,
        },
      });

      // Create default project
      const project = await tx.project.create({
        data: {
          workspaceId: ws.id,
          name: 'General',
          position: 0,
        },
      });

      // Create default channels
      await tx.channel.createMany({
        data: [
          {
            workspaceId: ws.id,
            projectId: project.id,
            name: 'general',
            type: 'text',
            position: 0,
          },
          {
            workspaceId: ws.id,
            projectId: project.id,
            name: 'random',
            type: 'text',
            position: 1,
          },
          {
            workspaceId: ws.id,
            projectId: project.id,
            name: 'Voice',
            type: 'voice',
            position: 2,
          },
        ],
      });

      return ws;
    });

    // Fetch complete workspace data
    const fullWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        projects: {
          include: {
            channels: { orderBy: { position: 'asc' } },
            categories: { orderBy: { position: 'asc' } },
          },
          orderBy: { position: 'asc' },
        },
        roles: { orderBy: { position: 'desc' } },
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({ success: true, data: fullWorkspace });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/:id - Get workspace details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          include: {
            channels: { orderBy: { position: 'asc' } },
            categories: { orderBy: { position: 'asc' } },
          },
          orderBy: { position: 'asc' },
        },
        roles: { orderBy: { position: 'desc' } },
        members: {
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
            role: true,
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!workspace) {
      throw new AppError(404, 'NOT_FOUND', 'Workspace not found');
    }

    res.json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces/:id/join - Join via invite code
router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { code } = req.body;
    
    const invite = await prisma.invite.findUnique({
      where: { code },
      include: { workspace: true },
    });

    if (!invite) {
      throw new AppError(404, 'INVALID_INVITE', 'Invalid or expired invite');
    }

    if (invite.workspaceId !== req.params.id) {
      throw new AppError(400, 'WRONG_WORKSPACE', 'This invite is for a different workspace');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new AppError(410, 'EXPIRED_INVITE', 'This invite has expired');
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new AppError(410, 'MAX_USES', 'This invite has reached its maximum uses');
    }

    // Check if already member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: req.user!.id,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'ALREADY_MEMBER', 'You are already a member of this workspace');
    }

    // Get default role
    const defaultRole = await prisma.role.findFirst({
      where: { workspaceId: invite.workspaceId, isDefault: true },
    });

    if (!defaultRole) {
      throw new AppError(500, 'NO_DEFAULT_ROLE', 'Workspace configuration error');
    }

    // Join workspace
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: req.user!.id,
          roleId: defaultRole.id,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
    ]);

    res.json({ success: true, data: { workspace: invite.workspace } });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces/:id/invites - Create invite
router.post('/:id/invites', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { maxUses, expiresInHours } = req.body;
    
    // Check membership and permissions
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: req.user!.id,
        },
      },
      include: { role: true },
    });

    if (!membership) {
      throw new AppError(403, 'NOT_MEMBER', 'You are not a member of this workspace');
    }

    const invite = await prisma.invite.create({
      data: {
        code: nanoid(8),
        workspaceId: req.params.id,
        inviterId: req.user!.id,
        maxUses: maxUses || null,
        expiresAt: expiresInHours 
          ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) 
          : null,
      },
    });

    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    next(error);
  }
});

export default router;
`);

console.log('\n✅ Auth, Users, and Workspaces routes created!');
