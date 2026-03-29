#!/usr/bin/env node
/**
 * Nexus Frontend Stores & Services - Part 7
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

console.log('🚀 Nexus Frontend Stores & Services\n');

writeFile('apps/web/src/services/api.ts', `import type { 
  ApiResponse, 
  AuthTokens, 
  LoginRequest, 
  RegisterRequest,
  AuthUser,
  Workspace,
  Channel,
  Message,
  DirectMessageChannel,
} from '@nexus/shared';

const API_URL = '/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = localStorage.getItem('accessToken');
  return accessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: \`Bearer \${token}\` }),
    ...options.headers,
  };

  const response = await fetch(\`\${API_URL}\${endpoint}\`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  async login(data: LoginRequest): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const res = await request<{ user: AuthUser; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async register(data: RegisterRequest): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const res = await request<{ user: AuthUser; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await request<{ tokens: AuthTokens }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return res.data!.tokens;
  },

  async logout(refreshToken?: string): Promise<void> {
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  async getMe(): Promise<AuthUser> {
    const res = await request<{ user: AuthUser }>('/auth/me');
    return res.data!.user;
  },
};

// Workspace API
export const workspaceApi = {
  async list(): Promise<Workspace[]> {
    const res = await request<Workspace[]>('/workspaces');
    return res.data || [];
  },

  async get(id: string): Promise<Workspace> {
    const res = await request<Workspace>(\`/workspaces/\${id}\`);
    return res.data!;
  },

  async create(data: { name: string; description?: string }): Promise<Workspace> {
    const res = await request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async createInvite(workspaceId: string): Promise<{ code: string }> {
    const res = await request<{ code: string }>(\`/workspaces/\${workspaceId}/invites\`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return res.data!;
  },

  async joinWithInvite(workspaceId: string, code: string): Promise<Workspace> {
    const res = await request<{ workspace: Workspace }>(\`/workspaces/\${workspaceId}/join\`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return res.data!.workspace;
  },
};

// Channel API
export const channelApi = {
  async get(id: string): Promise<Channel> {
    const res = await request<Channel>(\`/channels/\${id}\`);
    return res.data!;
  },

  async create(data: { projectId: string; name: string; type?: string }): Promise<Channel> {
    const res = await request<Channel>('/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async update(id: string, data: Partial<Channel>): Promise<Channel> {
    const res = await request<Channel>(\`/channels/\${id}\`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await request(\`/channels/\${id}\`, { method: 'DELETE' });
  },
};

// Message API
export const messageApi = {
  async list(channelId: string, options?: { limit?: number; before?: string }): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    
    const query = params.toString() ? \`?\${params}\` : '';
    const res = await request<Message[]>(\`/messages/channel/\${channelId}\${query}\`);
    return res.data || [];
  },

  async send(channelId: string, content: string, replyToId?: string): Promise<Message> {
    const res = await request<Message>(\`/messages/channel/\${channelId}\`, {
      method: 'POST',
      body: JSON.stringify({ content, replyToId }),
    });
    return res.data!;
  },

  async edit(id: string, content: string): Promise<Message> {
    const res = await request<Message>(\`/messages/\${id}\`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await request(\`/messages/\${id}\`, { method: 'DELETE' });
  },

  async addReaction(messageId: string, emoji: string): Promise<void> {
    await request(\`/messages/\${messageId}/reactions\`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await request(\`/messages/\${messageId}/reactions/\${encodeURIComponent(emoji)}\`, {
      method: 'DELETE',
    });
  },
};

// Direct Messages API
export const dmApi = {
  async list(): Promise<DirectMessageChannel[]> {
    const res = await request<DirectMessageChannel[]>('/dm');
    return res.data || [];
  },

  async getOrCreate(userIds: string[]): Promise<DirectMessageChannel> {
    const res = await request<DirectMessageChannel>('/dm', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
    return res.data!;
  },

  async getMessages(channelId: string, options?: { limit?: number; before?: string }): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    
    const query = params.toString() ? \`?\${params}\` : '';
    const res = await request<Message[]>(\`/dm/\${channelId}/messages\${query}\`);
    return res.data || [];
  },

  async sendMessage(channelId: string, content: string): Promise<Message> {
    const res = await request<Message>(\`/dm/\${channelId}/messages\`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res.data!;
  },
};
`);

writeFile('apps/web/src/services/socket.ts', `import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@nexus/shared';
import { getAccessToken } from './api';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

export function connectSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChannel(channelId: string): void {
  socket?.emit('channel:join', { channelId });
}

export function leaveChannel(channelId: string): void {
  socket?.emit('channel:leave', { channelId });
}

export function sendMessage(channelId: string, content: string, replyToId?: string): void {
  socket?.emit('message:send', { channelId, content, replyToId });
}

export function editMessage(messageId: string, content: string): void {
  socket?.emit('message:edit', { messageId, content });
}

export function deleteMessage(messageId: string): void {
  socket?.emit('message:delete', { messageId });
}

export function startTyping(channelId: string): void {
  socket?.emit('typing:start', { channelId });
}

export function stopTyping(channelId: string): void {
  socket?.emit('typing:stop', { channelId });
}

export function addReaction(messageId: string, emoji: string): void {
  socket?.emit('reaction:add', { messageId, emoji });
}

export function removeReaction(messageId: string, emoji: string): void {
  socket?.emit('reaction:remove', { messageId, emoji });
}
`);

writeFile('apps/web/src/stores/authStore.ts', `import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@nexus/shared';
import { authApi, setAccessToken, getAccessToken } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthState {
  user: AuthUser | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { user, tokens } = await authApi.login({ email, password });
          setAccessToken(tokens.accessToken);
          set({
            user,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          connectSocket();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { user, tokens } = await authApi.register({ email, username, password });
          setAccessToken(tokens.accessToken);
          set({
            user,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          connectSocket();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await authApi.logout(refreshToken || undefined);
        } catch {
          // Ignore errors
        }
        disconnectSocket();
        setAccessToken(null);
        set({
          user: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      initialize: async () => {
        const token = getAccessToken();
        const { refreshToken } = get();

        if (!token && !refreshToken) {
          set({ isLoading: false });
          return;
        }

        try {
          // Try to get user with current token
          if (token) {
            try {
              const user = await authApi.getMe();
              set({ user, isAuthenticated: true, isLoading: false });
              connectSocket();
              return;
            } catch {
              // Token expired, try refresh
            }
          }

          // Try to refresh token
          if (refreshToken) {
            const tokens = await authApi.refresh(refreshToken);
            setAccessToken(tokens.accessToken);
            const user = await authApi.getMe();
            set({
              user,
              refreshToken: tokens.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            connectSocket();
          } else {
            throw new Error('No refresh token');
          }
        } catch {
          setAccessToken(null);
          set({
            user: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
);

// Initialize on load
useAuthStore.getState().initialize();
`);

writeFile('apps/web/src/stores/workspaceStore.ts', `import { create } from 'zustand';
import type { Workspace, Channel, Project, User } from '@nexus/shared';
import { workspaceApi } from '../services/api';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: (Workspace & { 
    projects: (Project & { channels: Channel[] })[];
    members: { user: User; role: any }[];
  }) | null;
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  selectChannel: (channel: Channel) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  createInvite: (workspaceId: string) => Promise<string>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  currentChannel: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceApi.list();
      set({ workspaces, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  selectWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceApi.get(workspaceId) as any;
      set({ 
        currentWorkspace: workspace, 
        currentChannel: workspace.projects?.[0]?.channels?.[0] || null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  selectChannel: (channel: Channel) => {
    set({ currentChannel: channel });
  },

  createWorkspace: async (name: string, description?: string) => {
    const workspace = await workspaceApi.create({ name, description });
    set(state => ({ workspaces: [...state.workspaces, workspace] }));
    return workspace;
  },

  createInvite: async (workspaceId: string) => {
    const { code } = await workspaceApi.createInvite(workspaceId);
    return code;
  },
}));
`);

writeFile('apps/web/src/stores/messageStore.ts', `import { create } from 'zustand';
import type { Message, User } from '@nexus/shared';
import { messageApi } from '../services/api';
import { getSocket } from '../services/socket';

interface MessageState {
  messages: Record<string, Message[]>; // channelId -> messages
  typingUsers: Record<string, User[]>; // channelId -> typing users
  isLoading: boolean;
  error: string | null;

  fetchMessages: (channelId: string) => Promise<void>;
  loadMoreMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTypingUser: (channelId: string, user: User) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  setupSocketListeners: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  typingUsers: {},
  isLoading: false,
  error: null,

  fetchMessages: async (channelId: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await messageApi.list(channelId, { limit: 50 });
      set(state => ({
        messages: { ...state.messages, [channelId]: messages },
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadMoreMessages: async (channelId: string) => {
    const { messages } = get();
    const channelMessages = messages[channelId] || [];
    if (channelMessages.length === 0) return;

    const oldest = channelMessages[0];
    try {
      const olderMessages = await messageApi.list(channelId, {
        limit: 50,
        before: oldest.createdAt.toString(),
      });
      
      if (olderMessages.length > 0) {
        set(state => ({
          messages: {
            ...state.messages,
            [channelId]: [...olderMessages, ...state.messages[channelId]],
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  },

  addMessage: (channelId: string, message: Message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    }));
  },

  updateMessage: (channelId: string, message: Message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).map(m =>
          m.id === message.id ? message : m
        ),
      },
    }));
  },

  removeMessage: (channelId: string, messageId: string) => {
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).filter(m => m.id !== messageId),
      },
    }));
  },

  setTypingUser: (channelId: string, user: User) => {
    set(state => {
      const users = state.typingUsers[channelId] || [];
      if (users.find(u => u.id === user.id)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...users, user],
        },
      };
    });
  },

  removeTypingUser: (channelId: string, userId: string) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: (state.typingUsers[channelId] || []).filter(u => u.id !== userId),
      },
    }));
  },

  setupSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('message:created', (message) => {
      get().addMessage(message.channelId, message);
    });

    socket.on('message:updated', (message) => {
      get().updateMessage(message.channelId, message);
    });

    socket.on('message:deleted', ({ id, channelId }) => {
      get().removeMessage(channelId, id);
    });

    socket.on('typing:started', ({ channelId, user }) => {
      get().setTypingUser(channelId, user);
      // Auto-remove after 5 seconds
      setTimeout(() => {
        get().removeTypingUser(channelId, user.id);
      }, 5000);
    });

    socket.on('typing:stopped', ({ channelId, userId }) => {
      get().removeTypingUser(channelId, userId);
    });
  },
}));
`);

console.log('\n✅ Frontend stores and services created!');
