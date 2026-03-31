const fs = require('fs');
const path = require('path');

// Create additional directories for desktop and notifications
const extraDirs = [
  'g:\\Projects\\teamcord\\apps\\desktop\\src-tauri\\src',
  'g:\\Projects\\teamcord\\apps\\desktop\\src-tauri\\icons',
  'g:\\Projects\\teamcord\\services\\notifications\\src',
];

extraDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

const basePath = 'g:\\Projects\\teamcord\\apps\\web\\src';
const dirs = [
  'types',
  'services',
  'stores',
  'components',
  'components\\layout',
  'components\\chat',
  'components\\workspace',
  'components\\ui',
  'utils',
  'app\\app',
  'app\\onboarding'
];

// Create directories
dirs.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

console.log('\n📁 Directory structure created successfully!');

// Create files
const files = {
  'types\\index.ts': `export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  role: 'admin' | 'member' | 'owner';
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  ownerId: string;
  plan: 'community' | 'plus' | 'pro';
  createdAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  type: 'text' | 'voice' | 'announcement' | 'dm';
  topic: string | null;
  position: number;
  parentId: string | null;
  isPrivate: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: 'text' | 'system' | 'file' | 'decision';
  replyToId: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
  edited: boolean;
  editedAt: string | null;
  createdAt: string;
  author?: User;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface GatewayEvent {
  type: string;
  payload: unknown;
  workspaceId: string;
  channelId?: string;
  timestamp: string;
}
`,
  'services\\api.ts': `const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { auth = true, ...fetchOptions } = options;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (auth && this.getToken()) {
      (headers as Record<string, string>)['Authorization'] = \`Bearer \${this.getToken()}\`;
    }

    const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || \`HTTP \${response.status}\`);
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const result = await this.fetch<{ data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    this.setToken(result.data.token);
    return result.data;
  }

  async register(email: string, password: string, displayName: string) {
    const result = await this.fetch<{ data: { user: any; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
      auth: false,
    });
    this.setToken(result.data.token);
    return result.data;
  }

  async logout() {
    this.setToken(null);
  }

  async getMe() {
    return this.fetch<{ data: any }>('/auth/me');
  }

  async getWorkspaces() {
    return this.fetch<{ data: any[] }>('/workspaces');
  }

  async createWorkspace(name: string, slug: string) {
    return this.fetch<{ data: any }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
  }

  async getWorkspace(id: string) {
    return this.fetch<{ data: any }>(\`/workspaces/\${id}\`);
  }

  async getChannels(workspaceId: string) {
    return this.fetch<{ data: any[] }>(\`/channels?workspaceId=\${workspaceId}\`);
  }

  async createChannel(workspaceId: string, name: string, type: string = 'text') {
    return this.fetch<{ data: any }>('/channels', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, name, type }),
    });
  }

  async getMessages(channelId: string, limit = 50) {
    return this.fetch<{ data: any[] }>(\`/messages/\${channelId}?limit=\${limit}\`);
  }

  async sendMessage(channelId: string, content: string, replyToId?: string) {
    return this.fetch<{ data: any }>(\`/messages/\${channelId}\`, {
      method: 'POST',
      body: JSON.stringify({ content, type: 'text', replyToId }),
    });
  }

  async editMessage(channelId: string, messageId: string, content: string) {
    return this.fetch<{ data: any }>(\`/messages/\${channelId}/\${messageId}\`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(channelId: string, messageId: string) {
    return this.fetch<{ data: any }>(\`/messages/\${channelId}/\${messageId}\`, {
      method: 'DELETE',
    });
  }

  async search(workspaceId: string, query: string) {
    return this.fetch<{ data: any[] }>(\`/search?workspaceId=\${workspaceId}&q=\${encodeURIComponent(query)}\`);
  }
}

export const api = new ApiService();
export default api;
`,
  'stores\\useAppStore.ts': `import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Workspace, Channel, Message } from '../types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Workspace state
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  
  // Channel state
  channels: Channel[];
  currentChannel: Channel | null;
  
  // Message state
  messages: Record<string, Message[]>;
  
  // UI state
  sidebarOpen: boolean;
  membersPanelOpen: boolean;
  
  // Actions - User
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  
  // Actions - Workspace
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  
  // Actions - Channel
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  removeChannel: (id: string) => void;
  
  // Actions - Messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  
  // Actions - UI
  toggleSidebar: () => void;
  toggleMembersPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMembersPanelOpen: (open: boolean) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  workspaces: [],
  currentWorkspace: null,
  channels: [],
  currentChannel: null,
  messages: {},
  sidebarOpen: true,
  membersPanelOpen: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // User actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

      // Workspace actions
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),
      updateWorkspace: (id, updates) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
          currentWorkspace:
            state.currentWorkspace?.id === id
              ? { ...state.currentWorkspace, ...updates }
              : state.currentWorkspace,
        })),

      // Channel actions
      setChannels: (channels) => set({ channels }),
      setCurrentChannel: (currentChannel) => set({ currentChannel }),
      addChannel: (channel) =>
        set((state) => ({ channels: [...state.channels, channel] })),
      updateChannel: (id, updates) =>
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          currentChannel:
            state.currentChannel?.id === id
              ? { ...state.currentChannel, ...updates }
              : state.currentChannel,
        })),
      removeChannel: (id) =>
        set((state) => ({
          channels: state.channels.filter((c) => c.id !== id),
          currentChannel:
            state.currentChannel?.id === id ? null : state.currentChannel,
        })),

      // Message actions
      setMessages: (channelId, messages) =>
        set((state) => ({
          messages: { ...state.messages, [channelId]: messages },
        })),
      addMessage: (channelId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: [...(state.messages[channelId] || []), message],
          },
        })),
      updateMessage: (channelId, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        })),
      removeMessage: (channelId, messageId) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).filter(
              (m) => m.id !== messageId
            ),
          },
        })),

      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleMembersPanel: () =>
        set((state) => ({ membersPanelOpen: !state.membersPanelOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setMembersPanelOpen: (membersPanelOpen) => set({ membersPanelOpen }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'teamcord-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentWorkspace: state.currentWorkspace,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useAppStore;
`
};

// Write files
console.log('\n📝 Creating source files...');
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(basePath, filePath);
  fs.writeFileSync(fullPath, content);
  console.log(`✓ Created: ${filePath}`);
});

console.log('\n✅ All files created successfully!');
