#!/usr/bin/env node
/**
 * Nexus API Source Generator - Part 2
 * Run this after setup-nexus.js
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

console.log('🚀 Nexus API Source Files\n');

// =====================================================
// API - Main Entry Point
// =====================================================

writeFile('apps/api/src/index.ts', `import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@nexus/shared';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import workspaceRoutes from './routes/workspaces.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import dmRoutes from './routes/directMessages.js';

import { setupWebSocket } from './websocket/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);

// Error handler
app.use(errorHandler);

// WebSocket setup
setupWebSocket(io);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(\`🚀 Nexus API running on port \${PORT}\`);
  logger.info(\`📡 WebSocket server ready\`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
`);

// =====================================================
// API - Utils
// =====================================================

writeFile('apps/api/src/utils/prisma.ts', `import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
`);

writeFile('apps/api/src/utils/logger.ts', `import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return \`\${timestamp} [\${level}]: \${message}\`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});
`);

writeFile('apps/api/src/utils/jwt.ts', `import jwt from 'jsonwebtoken';
import type { AuthUser } from '@nexus/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export function getTokenExpiresIn(): number {
  // Return expiry in seconds
  const match = JWT_EXPIRES_IN.match(/(\\d+)([smhd])/);
  if (!match) return 900; // Default 15 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}
`);

writeFile('apps/api/src/utils/password.ts', `import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
`);

writeFile('apps/api/src/utils/validation.ts', `import { z } from 'zod';
import { MAX_MESSAGE_LENGTH, MAX_USERNAME_LENGTH, MAX_CHANNEL_NAME_LENGTH } from '@nexus/shared';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(MAX_USERNAME_LENGTH, \`Username must be at most \${MAX_USERNAME_LENGTH} characters\`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(500).optional(),
});

export const createChannelSchema = z.object({
  name: z.string().min(1).max(MAX_CHANNEL_NAME_LENGTH),
  topic: z.string().max(1024).optional(),
  type: z.enum(['text', 'voice', 'stage', 'announcement']).default('text'),
  isPrivate: z.boolean().default(false),
  categoryId: z.string().optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  replyToId: z.string().optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});
`);

// =====================================================
// API - Middleware
// =====================================================

writeFile('apps/api/src/middleware/auth.ts', `import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'No token provided' } 
      });
      return;
    }

    const token = authHeader.substring(7);
    
    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } 
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      res.status(401).json({ 
        success: false, 
        error: { code: 'USER_NOT_FOUND', message: 'User not found' } 
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, res, next);
}
`);

writeFile('apps/api/src/middleware/errorHandler.ts', `import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(\`Error: \${err.message}\`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(e.message);
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // Don't leak error details in production
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  });
}
`);

writeFile('apps/api/src/middleware/requestLogger.ts', `import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(\`\${req.method} \${req.path} \${res.statusCode} \${duration}ms\`);
  });
  
  next();
}
`);

writeFile('apps/api/src/middleware/rateLimiter.ts', `import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
`);

console.log('\n✅ API middleware and utils created!');
