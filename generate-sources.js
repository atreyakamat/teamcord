/**
 * TeamCord/Nexus - Complete Source File Generator
 * Run this with: node generate-sources.js
 * 
 * This script generates all the frontend source files for the Discord-like UI
 */

const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'apps', 'web', 'src');

// Directory structure to create
const dirs = [
  'components',
  'components/layout',
  'components/chat',
  'components/workspace',
  'components/ui',
  'stores',
  'services',
  'types',
  'utils',
];

// Create directories
dirs.forEach(dir => {
  const fullPath = path.join(basePath, dir);
  fs.mkdirSync(fullPath, { recursive: true });
});

console.log('✓ Directories created');

// ─── File Contents ────────────────────────────────────────────────────────────

const files = {
  // ─── Types ────────────────────────────────────────────────────────────────────
  'types/index.ts': `
export interface User {
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
  parentId: string | null; // for threads
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

  // ─── API Service ──────────────────────────────────────────────────────────────
  'services/api.ts': `
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

  // Auth
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

  // Workspaces
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

  // Channels
  async getChannels(workspaceId: string) {
    return this.fetch<{ data: any[] }>(\`/channels?workspaceId=\${workspaceId}\`);
  }

  async createChannel(workspaceId: string, name: string, type: string = 'text') {
    return this.fetch<{ data: any }>('/channels', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, name, type }),
    });
  }

  // Messages
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

  // Search
  async search(workspaceId: string, query: string) {
    return this.fetch<{ data: any[] }>(\`/search?workspaceId=\${workspaceId}&q=\${encodeURIComponent(query)}\`);
  }
}

export const api = new ApiService();
export default api;
`,

  // ─── WebSocket Service ────────────────────────────────────────────────────────
  'services/gateway.ts': `
import type { GatewayEvent } from '../types';

type EventHandler = (event: GatewayEvent) => void;

class GatewayService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private subscribedChannels: Set<string> = new Set();

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
    this.ws = new WebSocket(\`\${wsUrl}?token=\${token}\`);

    this.ws.onopen = () => {
      console.log('[gateway] Connected');
      this.reconnectAttempts = 0;
      // Resubscribe to channels
      this.subscribedChannels.forEach(channelId => {
        this.send({ type: 'subscribe:channel', channelId });
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GatewayEvent;
        this.emit(data.type, data);
        this.emit('*', data); // Wildcard handler
      } catch (e) {
        console.error('[gateway] Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[gateway] Disconnected');
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('[gateway] Error:', error);
    };
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[gateway] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(\`[gateway] Reconnecting (attempt \${this.reconnectAttempts})...\`);
      this.connect(token);
    }, delay);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.subscribedChannels.clear();
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribeChannel(channelId: string) {
    this.subscribedChannels.add(channelId);
    this.send({ type: 'subscribe:channel', channelId });
  }

  unsubscribeChannel(channelId: string) {
    this.subscribedChannels.delete(channelId);
    this.send({ type: 'unsubscribe:channel', channelId });
  }

  sendTyping(channelId: string, workspaceId: string) {
    this.send({ type: 'typing:start', channelId, workspaceId });
  }

  stopTyping(channelId: string, workspaceId: string) {
    this.send({ type: 'typing:stop', channelId, workspaceId });
  }

  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.off(eventType, handler);
  }

  off(eventType: string, handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler);
  }

  private emit(eventType: string, event: GatewayEvent) {
    this.handlers.get(eventType)?.forEach(handler => handler(event));
  }
}

export const gateway = new GatewayService();
export default gateway;
`,

  // ─── Store ────────────────────────────────────────────────────────────────────
  'stores/useAppStore.ts': `
"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Workspace, Channel, Message } from '../types';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (id: string | null) => void;

  // Channels
  channels: Channel[];
  currentChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (id: string | null) => void;

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (channelId: string, message: Message) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (channelId: string, messageId: string) => void;

  // UI State
  showMemberList: boolean;
  toggleMemberList: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  token: null,
  workspaces: [],
  currentWorkspaceId: null,
  channels: [],
  currentChannelId: null,
  messages: {},
  showMemberList: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),

      setChannels: (channels) => set({ channels }),
      setCurrentChannel: (id) => set({ currentChannelId: id }),

      addMessage: (channelId, message) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: [...(state.messages[channelId] || []), message],
        },
      })),

      setMessages: (channelId, messages) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: messages,
        },
      })),

      updateMessage: (channelId, messageId, updates) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: (state.messages[channelId] || []).map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      })),

      deleteMessage: (channelId, messageId) => set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: (state.messages[channelId] || []).filter((m) => m.id !== messageId),
        },
      })),

      showMemberList: true,
      toggleMemberList: () => set((state) => ({ showMemberList: !state.showMemberList })),

      reset: () => set(initialState),
    }),
    {
      name: 'teamcord-store',
      partialize: (state) => ({
        token: state.token,
        currentWorkspaceId: state.currentWorkspaceId,
        showMemberList: state.showMemberList,
      }),
    }
  )
);
`,

  // ─── Server Rail Component ────────────────────────────────────────────────────
  'components/layout/ServerRail.tsx': `
"use client";

import { useState } from "react";
import styles from "./ServerRail.module.css";

interface Workspace {
  id: string;
  name: string;
  icon?: string | null;
}

interface ServerRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onCreateWorkspace: () => void;
  onHomeClick: () => void;
}

export function ServerRail({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
  onHomeClick,
}: ServerRailProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <nav className={styles.serverRail} aria-label="Workspaces">
      {/* Home / DMs Button */}
      <div className={styles.section}>
        <button
          className={\`\${styles.serverButton} \${styles.homeButton} \${
            activeWorkspaceId === null ? styles.active : ""
          }\`}
          onClick={onHomeClick}
          onMouseEnter={() => setHoveredId("home")}
          onMouseLeave={() => setHoveredId(null)}
          aria-label="Direct Messages"
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
            <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4062 0.461742 17.1749 0.934541 16.9708 1.4184C15.003 1.12145 12.9974 1.12145 11.0283 1.4184C10.8233 0.934541 10.592 0.461742 10.3389 0C8.48994 0.317742 6.68659 0.878138 4.97617 1.67529C1.42065 6.77862 0.351166 11.7557 0.886097 16.654C3.18014 18.3893 5.89287 19.5958 8.75439 20.089C9.33337 19.3173 9.84921 18.4969 10.2962 17.635C9.47714 17.3253 8.68929 16.9477 7.93871 16.5086C8.13605 16.3696 8.32939 16.2255 8.51702 16.0814C12.7505 18.0493 17.3049 18.0493 21.4846 16.0814C21.6731 16.2255 21.8664 16.3696 22.0629 16.5086C21.3131 16.9477 20.5252 17.3253 19.7062 17.635C20.1524 18.4969 20.6682 19.3173 21.2472 20.089C24.1087 19.5958 26.8214 18.3893 29.1155 16.654C29.7509 10.9372 28.1 6.01014 23.0212 1.67671Z" />
          </svg>
        </button>
        <div className={styles.separator} />
      </div>

      {/* Workspace List */}
      <div className={styles.workspaceList}>
        {workspaces.map((workspace) => (
          <div key={workspace.id} className={styles.serverItem}>
            {activeWorkspaceId === workspace.id && (
              <div className={styles.activePill} />
            )}
            {hoveredId === workspace.id && activeWorkspaceId !== workspace.id && (
              <div className={styles.hoverPill} />
            )}
            <button
              className={\`\${styles.serverButton} \${
                activeWorkspaceId === workspace.id ? styles.active : ""
              }\`}
              onClick={() => onWorkspaceSelect(workspace.id)}
              onMouseEnter={() => setHoveredId(workspace.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={workspace.name}
              title={workspace.name}
            >
              {workspace.icon ? (
                <img
                  src={workspace.icon}
                  alt={workspace.name}
                  className={styles.serverIcon}
                />
              ) : (
                <span className={styles.serverInitial}>
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Add Server Button */}
      <div className={styles.section}>
        <div className={styles.separator} />
        <button
          className={\`\${styles.serverButton} \${styles.addButton}\`}
          onClick={onCreateWorkspace}
          onMouseEnter={() => setHoveredId("add")}
          onMouseLeave={() => setHoveredId(null)}
          aria-label="Create Workspace"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6V5z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
`,

  'components/layout/ServerRail.module.css': `
.serverRail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: var(--server-rail-width);
  height: 100%;
  padding: 12px 0;
  background: var(--dc-bg-tertiary);
  overflow-y: auto;
  overflow-x: hidden;
}

.section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.separator {
  width: 32px;
  height: 2px;
  margin: 8px 0;
  background: var(--dc-border);
  border-radius: 1px;
}

.workspaceList {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  overflow-y: auto;
}

.serverItem {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.activePill,
.hoverPill {
  position: absolute;
  left: 0;
  width: 8px;
  background: var(--dc-text-normal);
  border-radius: 0 4px 4px 0;
  transition: height var(--transition-normal);
}

.activePill {
  height: 40px;
}

.hoverPill {
  height: 20px;
}

.serverButton {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: var(--dc-bg-primary);
  color: var(--dc-status-online);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-radius var(--transition-fast), background var(--transition-fast);
  cursor: pointer;
  border: none;
  overflow: hidden;
}

.serverButton:hover {
  border-radius: 16px;
  background: var(--dc-blurple);
  color: white;
}

.serverButton.active {
  border-radius: 16px;
}

.homeButton {
  color: var(--dc-text-normal);
}

.homeButton.active {
  background: var(--dc-blurple);
  color: white;
}

.addButton {
  color: var(--dc-status-online);
}

.addButton:hover {
  background: var(--dc-status-online);
  color: white;
}

.serverIcon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.serverInitial {
  font-size: 18px;
  font-weight: 500;
  color: inherit;
}
`,

  // ─── Channel Sidebar Component ────────────────────────────────────────────────
  'components/layout/ChannelSidebar.tsx': `
"use client";

import { useState } from "react";
import styles from "./ChannelSidebar.module.css";

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
}

interface ChannelSidebarProps {
  workspaceName: string;
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (id: string) => void;
  onCreateChannel: () => void;
  currentUser: {
    displayName: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    avatarUrl?: string | null;
  };
  onSettingsClick: () => void;
}

export function ChannelSidebar({
  workspaceName,
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  currentUser,
  onSettingsClick,
}: ChannelSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const textChannels = channels.filter(c => c.type === 'text' || c.type === 'announcement');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  const ChannelIcon = ({ type }: { type: string }) => {
    if (type === 'voice') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v12.5c0 .83-.67 1.5-1.5 1.5S3 16.33 3 15.5 3.67 14 4.5 14c.08 0 .15.01.23.02L5 14V3a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v11c0 1.66-1.34 3-3 3h-1v4h2a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2v-4H8a3 3 0 0 1-3-3V5.91a3.49 3.49 0 0 0-1 6.59V12h1c1.66 0 3 1.34 3 3s-1.34 3-3 3c-.83 0-1.5-.67-1.5-1.5S4.67 15 5.5 15h.5v-.5c0-.28-.22-.5-.5-.5h-1a1 1 0 0 1 0-2h1c1.38 0 2.5 1.12 2.5 2.5v.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V3z"/>
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
      </svg>
    );
  };

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: 'var(--dc-status-online)',
      idle: 'var(--dc-status-idle)',
      dnd: 'var(--dc-status-dnd)',
      offline: 'var(--dc-status-offline)',
    };
    return (
      <div
        className={styles.statusDot}
        style={{ background: colors[status] || colors.offline }}
      />
    );
  };

  return (
    <div className={styles.sidebar}>
      {/* Workspace Header */}
      <div className={styles.workspaceHeader}>
        <h2 className={styles.workspaceName}>{workspaceName}</h2>
        <button className={styles.dropdownButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>
      </div>

      {/* Channel List */}
      <div className={styles.channelList}>
        {/* Text Channels */}
        <div className={styles.category}>
          <button
            className={styles.categoryHeader}
            onClick={() => setCollapsed(c => ({ ...c, text: !c.text }))}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transform: collapsed.text ? 'rotate(-90deg)' : 'none' }}
            >
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
            <span>TEXT CHANNELS</span>
            <button
              className={styles.addChannelBtn}
              onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
              title="Create Channel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6V5z" />
              </svg>
            </button>
          </button>
          {!collapsed.text && (
            <div className={styles.channelItems}>
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  className={\`\${styles.channelItem} \${
                    activeChannelId === channel.id ? styles.active : ""
                  }\`}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <ChannelIcon type={channel.type} />
                  <span className={styles.channelName}>{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice Channels */}
        {voiceChannels.length > 0 && (
          <div className={styles.category}>
            <button
              className={styles.categoryHeader}
              onClick={() => setCollapsed(c => ({ ...c, voice: !c.voice }))}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ transform: collapsed.voice ? 'rotate(-90deg)' : 'none' }}
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
              <span>VOICE CHANNELS</span>
            </button>
            {!collapsed.voice && (
              <div className={styles.channelItems}>
                {voiceChannels.map((channel) => (
                  <button
                    key={channel.id}
                    className={\`\${styles.channelItem} \${
                      activeChannelId === channel.id ? styles.active : ""
                    }\`}
                    onClick={() => onChannelSelect(channel.id)}
                  >
                    <ChannelIcon type={channel.type} />
                    <span className={styles.channelName}>{channel.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Panel */}
      <div className={styles.userPanel}>
        <div className={styles.userInfo}>
          <div className={styles.avatarWrapper}>
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <StatusDot status={currentUser.status} />
          </div>
          <div className={styles.userText}>
            <div className={styles.userName}>{currentUser.displayName}</div>
            <div className={styles.userStatus}>{currentUser.status}</div>
          </div>
        </div>
        <div className={styles.userActions}>
          <button className={styles.iconButton} title="Mute">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1H3v1a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11v-1h-2z"/>
            </svg>
          </button>
          <button className={styles.iconButton} title="Deafen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.5 11c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5S6 16.33 6 15.5v-3c0-.83.67-1.5 1.5-1.5zm9 0c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5S15 16.33 15 15.5v-3c0-.83.67-1.5 1.5-1.5z"/>
            </svg>
          </button>
          <button className={styles.iconButton} title="Settings" onClick={onSettingsClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
`,

  'components/layout/ChannelSidebar.module.css': `
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--channel-sidebar-width);
  height: 100%;
  background: var(--dc-bg-secondary);
}

.workspaceHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 16px;
  border-bottom: 1px solid var(--dc-bg-tertiary);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.workspaceHeader:hover {
  background: var(--dc-bg-hover);
}

.workspaceName {
  font-size: 15px;
  font-weight: 600;
  color: var(--dc-text-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdownButton {
  color: var(--dc-text-normal);
  padding: 4px;
}

.channelList {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.category {
  margin-top: 16px;
}

.categoryHeader {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 0 8px;
  color: var(--dc-text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.categoryHeader:hover {
  color: var(--dc-text-normal);
}

.categoryHeader svg {
  transition: transform var(--transition-fast);
}

.categoryHeader span {
  flex: 1;
  text-align: left;
}

.addChannelBtn {
  padding: 2px;
  color: var(--dc-text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.categoryHeader:hover .addChannelBtn {
  opacity: 1;
}

.addChannelBtn:hover {
  color: var(--dc-text-normal);
}

.channelItems {
  margin-top: 4px;
}

.channelItem {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  color: var(--dc-channel-icon);
  font-size: 16px;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.channelItem:hover {
  background: var(--dc-bg-hover);
  color: var(--dc-interactive-hover);
}

.channelItem.active {
  background: var(--dc-bg-selected);
  color: var(--dc-interactive-active);
}

.channelItem svg {
  flex-shrink: 0;
  color: inherit;
}

.channelName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.userPanel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--user-panel-height);
  padding: 0 8px;
  background: var(--dc-bg-floating);
}

.userInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.avatarWrapper {
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.avatar,
.avatarFallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar {
  object-fit: cover;
}

.avatarFallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dc-blurple);
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.statusDot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 3px solid var(--dc-bg-floating);
}

.userText {
  min-width: 0;
}

.userName {
  font-size: 14px;
  font-weight: 500;
  color: var(--dc-text-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.userStatus {
  font-size: 12px;
  color: var(--dc-text-muted);
  text-transform: capitalize;
}

.userActions {
  display: flex;
  gap: 4px;
}

.iconButton {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  color: var(--dc-interactive-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.iconButton:hover {
  background: var(--dc-bg-hover);
  color: var(--dc-interactive-hover);
}
`,

  // ─── Chat Area Component ──────────────────────────────────────────────────────
  'components/chat/ChatArea.tsx': `
"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ChatArea.module.css";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";

interface Message {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  edited?: boolean;
  author?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
}

interface ChatAreaProps {
  channelName: string;
  channelTopic?: string | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  isLoading?: boolean;
  typingUsers?: string[];
  onToggleMemberList: () => void;
  onSearch: () => void;
}

export function ChatArea({
  channelName,
  channelTopic,
  messages,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  isLoading = false,
  typingUsers = [],
  onToggleMemberList,
  onSearch,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Group messages by author and time (5 min threshold)
  const groupedMessages = messages.reduce<Message[][]>((groups, message, index) => {
    const prevMessage = messages[index - 1];
    const timeDiff = prevMessage
      ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
      : Infinity;
    const sameAuthor = prevMessage?.authorId === message.authorId;
    const withinTimeThreshold = timeDiff < 5 * 60 * 1000; // 5 minutes

    if (sameAuthor && withinTimeThreshold && groups.length > 0) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  return (
    <div className={styles.chatArea}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={styles.hashIcon}>
            <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
          </svg>
          <h1 className={styles.channelName}>{channelName}</h1>
          {channelTopic && (
            <>
              <div className={styles.divider} />
              <p className={styles.channelTopic}>{channelTopic}</p>
            </>
          )}
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerButton} title="Search" onClick={onSearch}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.707 20.293l-4.054-4.054A8.965 8.965 0 0 0 19 11a9 9 0 1 0-9 9 8.965 8.965 0 0 0 5.239-1.347l4.054 4.054a1 1 0 0 0 1.414-1.414zM11 17a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
            </svg>
          </button>
          <button className={styles.headerButton} title="Members" onClick={onToggleMemberList}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z"/>
              <path d="M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM18 17.006V20.006H22V18.006C22 15.579 19.791 13.806 16.8 13.267C17.561 14.343 18 15.619 18 17.006Z"/>
              <path d="M18 5.00598C19.657 5.00598 21 6.34898 21 8.00598C21 9.66298 19.657 11.006 18 11.006C17.6 11.006 17.218 10.935 16.861 10.809C17.568 9.97698 18 8.93998 18 7.80598C18 6.67198 17.568 5.63498 16.861 4.80298C17.218 4.67698 17.6 4.60598 18 4.60598V5.00598Z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className="dc-spinner" />
          </div>
        ) : (
          <>
            <div className={styles.welcomeMessage}>
              <div className={styles.welcomeIcon}>
                <svg width="68" height="68" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
                </svg>
              </div>
              <h2>Welcome to #{channelName}!</h2>
              <p>This is the start of the #{channelName} channel.</p>
            </div>

            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className={styles.messageGroup}>
                {group.map((message, messageIndex) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isFirstInGroup={messageIndex === 0}
                    isOwnMessage={message.authorId === currentUserId}
                    isEditing={editingMessageId === message.id}
                    onStartEdit={() => setEditingMessageId(message.id)}
                    onCancelEdit={() => setEditingMessageId(null)}
                    onSaveEdit={(content) => {
                      onEditMessage(message.id, content);
                      setEditingMessageId(null);
                    }}
                    onDelete={() => onDeleteMessage(message.id)}
                    onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className={styles.typingIndicator}>
          <div className={styles.typingDots}>
            <span className="dc-typing-dot" />
            <span className="dc-typing-dot" />
            <span className="dc-typing-dot" />
          </div>
          <span>
            {typingUsers.length === 1
              ? \`\${typingUsers[0]} is typing...\`
              : typingUsers.length === 2
              ? \`\${typingUsers[0]} and \${typingUsers[1]} are typing...\`
              : \`\${typingUsers.length} people are typing...\`}
          </span>
        </div>
      )}

      {/* Input */}
      <MessageInput
        channelName={channelName}
        onSend={onSendMessage}
      />
    </div>
  );
}
`,

  'components/chat/ChatArea.module.css': `
.chatArea {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background: var(--dc-bg-primary);
  min-width: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 16px;
  border-bottom: 1px solid var(--dc-bg-tertiary);
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.hashIcon {
  color: var(--dc-channel-icon);
  flex-shrink: 0;
}

.channelName {
  font-size: 16px;
  font-weight: 600;
  color: var(--dc-text-normal);
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--dc-border);
  margin: 0 8px;
}

.channelTopic {
  font-size: 14px;
  color: var(--dc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.headerActions {
  display: flex;
  gap: 4px;
}

.headerButton {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--dc-interactive-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}

.headerButton:hover {
  color: var(--dc-interactive-hover);
}

.messagesContainer {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcomeMessage {
  padding: 16px 16px 24px;
  margin-bottom: 16px;
}

.welcomeIcon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--dc-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: var(--dc-text-normal);
}

.welcomeMessage h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--dc-text-normal);
}

.welcomeMessage p {
  font-size: 16px;
  color: var(--dc-text-muted);
}

.messageGroup {
  margin-top: 16px;
}

.messageGroup:first-child {
  margin-top: 0;
}

.typingIndicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 24px;
  font-size: 14px;
  color: var(--dc-text-muted);
}

.typingDots {
  display: flex;
  gap: 4px;
}
`,

  // ─── Message Item Component ───────────────────────────────────────────────────
  'components/chat/MessageItem.tsx': `
"use client";

import { useState } from "react";
import styles from "./MessageItem.module.css";

interface Message {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  edited?: boolean;
  author?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
}

interface MessageItemProps {
  message: Message;
  isFirstInGroup: boolean;
  isOwnMessage: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string) => void;
  onDelete: () => void;
  onAddReaction: (emoji: string) => void;
}

export function MessageItem({
  message,
  isFirstInGroup,
  isOwnMessage,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAddReaction,
}: MessageItemProps) {
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return \`Today at \${timeStr}\`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return \`Yesterday at \${timeStr}\`;
    } else {
      return \`\${date.toLocaleDateString()} \${timeStr}\`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit(editContent);
    } else if (e.key === 'Escape') {
      onCancelEdit();
      setEditContent(message.content);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.messageEditing}>
        <textarea
          className={styles.editTextarea}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div className={styles.editHint}>
          escape to <button onClick={onCancelEdit}>cancel</button> • enter to{" "}
          <button onClick={() => onSaveEdit(editContent)}>save</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={\`\${styles.message} \${isFirstInGroup ? styles.firstInGroup : ""}\`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isFirstInGroup ? (
        <>
          <div className={styles.avatar}>
            {message.author?.avatarUrl ? (
              <img src={message.author.avatarUrl} alt="" />
            ) : (
              <div className={styles.avatarFallback}>
                {(message.author?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.messageContent}>
            <div className={styles.messageHeader}>
              <span className={styles.authorName}>
                {message.author?.displayName || 'Unknown User'}
              </span>
              <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
            </div>
            <div className={styles.messageText}>
              {message.content}
              {message.edited && <span className={styles.edited}>(edited)</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          <span className={styles.compactTimestamp}>
            {new Date(message.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <div className={styles.messageContent}>
            <div className={styles.messageText}>
              {message.content}
              {message.edited && <span className={styles.edited}>(edited)</span>}
            </div>
          </div>
        </>
      )}

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={styles.reactions}>
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              className={styles.reaction}
              onClick={() => onAddReaction(reaction.emoji)}
            >
              <span>{reaction.emoji}</span>
              <span className={styles.reactionCount}>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => onAddReaction('👍')}
            title="Add Reaction"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.007 0C5.391 0 0 5.37 0 11.974a11.89 11.89 0 0 0 3.213 8.13A11.9 11.9 0 0 0 12.007 24c6.616 0 11.993-5.37 11.993-11.974C24 5.37 18.623 0 12.007 0zm0 21.652c-5.355 0-9.727-4.36-9.727-9.678 0-5.318 4.372-9.678 9.727-9.678 5.355 0 9.727 4.36 9.727 9.678 0 5.318-4.372 9.678-9.727 9.678z"/>
              <path d="M7.522 10.957c.904 0 1.638-.733 1.638-1.635 0-.903-.734-1.635-1.638-1.635-.904 0-1.637.732-1.637 1.635 0 .902.733 1.635 1.637 1.635zm8.956 0c.904 0 1.637-.733 1.637-1.635 0-.903-.733-1.635-1.637-1.635-.904 0-1.638.732-1.638 1.635 0 .902.734 1.635 1.638 1.635zm-8.445 2.13c-.276-.28-.731-.282-1.01-.007-.28.276-.282.73-.007 1.01 1.532 1.555 3.52 2.413 5.598 2.413 2.077 0 4.064-.858 5.597-2.413.276-.28.273-.734-.007-1.01-.28-.275-.734-.273-1.01.007-1.237 1.255-2.842 1.947-4.58 1.947-1.74 0-3.344-.692-4.581-1.947z"/>
            </svg>
          </button>
          {isOwnMessage && (
            <>
              <button
                className={styles.actionButton}
                onClick={onStartEdit}
                title="Edit"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6893L3.60746 20.3924L10.3115 18.8152L18.0229 11.1029L12.8962 5.97688Z"/>
                </svg>
              </button>
              <button
                className={\`\${styles.actionButton} \${styles.deleteButton}\`}
                onClick={onDelete}
                title="Delete"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"/>
                  <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
`,

  'components/chat/MessageItem.module.css': `
.message {
  position: relative;
  display: flex;
  padding: 2px 16px 2px 72px;
  min-height: 22px;
}

.message:hover {
  background: var(--dc-bg-message-hover);
}

.firstInGroup {
  padding-top: 16px;
  margin-top: 16px;
}

.avatar {
  position: absolute;
  left: 16px;
  top: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarFallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dc-blurple);
  color: white;
  font-size: 16px;
  font-weight: 500;
}

.messageContent {
  flex: 1;
  min-width: 0;
}

.messageHeader {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.authorName {
  font-size: 16px;
  font-weight: 500;
  color: var(--dc-text-normal);
  cursor: pointer;
}

.authorName:hover {
  text-decoration: underline;
}

.timestamp {
  font-size: 12px;
  color: var(--dc-text-muted);
}

.compactTimestamp {
  position: absolute;
  left: 16px;
  width: 48px;
  font-size: 11px;
  color: transparent;
  text-align: right;
}

.message:hover .compactTimestamp {
  color: var(--dc-text-muted);
}

.messageText {
  font-size: 16px;
  line-height: 1.375;
  color: var(--dc-text-normal);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.edited {
  margin-left: 4px;
  font-size: 10px;
  color: var(--dc-text-muted);
}

.reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.reaction {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--dc-bg-secondary);
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.reaction:hover {
  background: var(--dc-bg-hover);
  border-color: var(--dc-border);
}

.reactionCount {
  color: var(--dc-text-muted);
  font-size: 12px;
}

.actions {
  position: absolute;
  top: -16px;
  right: 16px;
  display: flex;
  background: var(--dc-bg-secondary);
  border-radius: 4px;
  box-shadow: var(--dc-elevation-high);
  overflow: hidden;
}

.actionButton {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dc-interactive-normal);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.actionButton:hover {
  background: var(--dc-bg-hover);
  color: var(--dc-interactive-hover);
}

.deleteButton:hover {
  color: var(--dc-red);
}

.messageEditing {
  padding: 8px 16px 8px 72px;
}

.editTextarea {
  width: 100%;
  padding: 10px;
  background: var(--dc-bg-input);
  border: none;
  border-radius: 8px;
  color: var(--dc-text-normal);
  font-size: 16px;
  font-family: inherit;
  line-height: 1.375;
  resize: none;
}

.editHint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dc-text-muted);
}

.editHint button {
  color: var(--dc-text-link);
  background: none;
  border: none;
  cursor: pointer;
}

.editHint button:hover {
  text-decoration: underline;
}
`,

  // ─── Message Input Component ──────────────────────────────────────────────────
  'components/chat/MessageInput.tsx': `
"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./MessageInput.module.css";

interface MessageInputProps {
  channelName: string;
  onSend: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  channelName,
  onSend,
  onTyping,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = \`\${Math.min(textareaRef.current.scrollHeight, 200)}px\`;
    }
  }, [content]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping?.();
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <button className={styles.attachButton} title="Upload a file">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z" />
          </svg>
        </button>
        
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={\`Message #\${channelName}\`}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />

        <div className={styles.actionButtons}>
          <button className={styles.actionButton} title="Pick a GIF">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 5.999C2 4.895 2.898 4 4.003 4H20C21.103 4 22 4.895 22 5.999V18C22 19.104 21.103 20 20 20H4.003C2.898 20 2 19.104 2 18V5.999ZM10.833 8H8.5V16H10.833V11.96L12.909 16H15.833V8H13.5V12.04L10.833 8ZM7 9.985H4.25L4.25 10.015H7V11.985H4.25L4.25 14.015H7V16H4V8H7V9.985Z"/>
            </svg>
          </button>
          <button className={styles.actionButton} title="Open sticker picker">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.0002 0.504883C5.65015 0.504883 0.500153 5.65488 0.500153 12.0049C0.500153 18.3549 5.65015 23.5049 12.0002 23.5049C18.3502 23.5049 23.5002 18.3549 23.5002 12.0049C23.5002 5.65488 18.3502 0.504883 12.0002 0.504883ZM8.00015 8.00488C9.10015 8.00488 10.0002 8.90488 10.0002 10.0049C10.0002 11.1049 9.10015 12.0049 8.00015 12.0049C6.90015 12.0049 6.00015 11.1049 6.00015 10.0049C6.00015 8.90488 6.90015 8.00488 8.00015 8.00488ZM17.2002 14.8049C16.0002 17.0049 14.1002 18.0049 12.0002 18.0049C9.90015 18.0049 8.00015 17.0049 6.80015 14.8049C6.50015 14.3049 6.70015 13.6049 7.20015 13.3049C7.70015 13.0049 8.40015 13.2049 8.70015 13.7049C9.50015 15.1049 10.7002 16.0049 12.0002 16.0049C13.3002 16.0049 14.5002 15.1049 15.3002 13.7049C15.6002 13.2049 16.3002 13.0049 16.8002 13.3049C17.3002 13.6049 17.5002 14.3049 17.2002 14.8049ZM16.0002 12.0049C14.9002 12.0049 14.0002 11.1049 14.0002 10.0049C14.0002 8.90488 14.9002 8.00488 16.0002 8.00488C17.1002 8.00488 18.0002 8.90488 18.0002 10.0049C18.0002 11.1049 17.1002 12.0049 16.0002 12.0049Z"/>
            </svg>
          </button>
          <button className={styles.actionButton} title="Select emoji">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-3.5-8c.828 0 1.5-.672 1.5-1.5S9.328 11 8.5 11 7 11.672 7 12.5 7.672 14 8.5 14zm7 0c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm-3.5 4c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
`,

  'components/chat/MessageInput.module.css': `
.inputContainer {
  padding: 0 16px 24px;
  flex-shrink: 0;
}

.inputWrapper {
  display: flex;
  align-items: flex-end;
  padding: 0 16px;
  background: var(--dc-bg-input);
  border-radius: 8px;
}

.attachButton {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -10px;
  color: var(--dc-interactive-normal);
  transition: color var(--transition-fast);
}

.attachButton:hover {
  color: var(--dc-interactive-hover);
}

.textarea {
  flex: 1;
  max-height: 200px;
  padding: 11px 0;
  background: transparent;
  border: none;
  color: var(--dc-text-normal);
  font-size: 16px;
  line-height: 1.375;
  resize: none;
  overflow-y: auto;
}

.textarea::placeholder {
  color: var(--dc-text-muted);
}

.textarea:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.actionButtons {
  display: flex;
  align-items: center;
  margin-right: -10px;
}

.actionButton {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dc-interactive-normal);
  transition: color var(--transition-fast);
}

.actionButton:hover {
  color: var(--dc-interactive-hover);
}
`,

  // ─── Member List Component ────────────────────────────────────────────────────
  'components/layout/MemberList.tsx': `
"use client";

import styles from "./MemberList.module.css";

interface Member {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  role: 'admin' | 'member' | 'owner';
}

interface MemberListProps {
  members: Member[];
}

export function MemberList({ members }: MemberListProps) {
  const onlineMembers = members.filter(m => m.status !== 'offline');
  const offlineMembers = members.filter(m => m.status === 'offline');

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: 'var(--dc-status-online)',
      idle: 'var(--dc-status-idle)',
      dnd: 'var(--dc-status-dnd)',
      offline: 'var(--dc-status-offline)',
    };
    return (
      <div
        className={styles.statusDot}
        style={{ background: colors[status] || colors.offline }}
      />
    );
  };

  const MemberItem = ({ member }: { member: Member }) => (
    <div className={styles.member}>
      <div className={styles.avatarWrapper}>
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}>
            {member.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <StatusDot status={member.status} />
      </div>
      <span className={\`\${styles.memberName} \${member.status === 'offline' ? styles.offline : ''}\`}>
        {member.displayName}
      </span>
      {member.role === 'owner' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--dc-yellow)" className={styles.crown}>
          <path d="M5 18h14v2H5v-2zm7-14l5 6-2.5 1.5L12 8l-2.5 3.5L7 10l5-6z"/>
        </svg>
      )}
    </div>
  );

  return (
    <aside className={styles.memberList}>
      {onlineMembers.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>ONLINE — {onlineMembers.length}</h3>
          {onlineMembers.map(member => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>
      )}
      
      {offlineMembers.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>OFFLINE — {offlineMembers.length}</h3>
          {offlineMembers.map(member => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>
      )}
    </aside>
  );
}
`,

  'components/layout/MemberList.module.css': `
.memberList {
  width: var(--member-list-width);
  height: 100%;
  background: var(--dc-bg-secondary);
  padding: 24px 8px 0;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.sectionTitle {
  padding: 0 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dc-text-muted);
  letter-spacing: 0.02em;
}

.member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.member:hover {
  background: var(--dc-bg-hover);
}

.avatarWrapper {
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.avatar,
.avatarFallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar {
  object-fit: cover;
}

.avatarFallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dc-blurple);
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.statusDot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 3px solid var(--dc-bg-secondary);
}

.memberName {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  color: var(--dc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member:hover .memberName {
  color: var(--dc-interactive-hover);
}

.memberName.offline {
  color: var(--dc-interactive-muted);
}

.crown {
  flex-shrink: 0;
}
`,

  // ─── Main Layout Component ────────────────────────────────────────────────────
  'components/layout/MainLayout.tsx': `
"use client";

import styles from "./MainLayout.module.css";
import { ServerRail } from "./ServerRail";
import { ChannelSidebar } from "./ChannelSidebar";
import { MemberList } from "./MemberList";
import { ChatArea } from "../chat/ChatArea";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // This is a layout shell - actual data will come from the page component
  return (
    <div className={styles.appContainer}>
      {children}
    </div>
  );
}
`,

  'components/layout/MainLayout.module.css': `
.appContainer {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--dc-bg-tertiary);
}
`,

  // ─── Component Exports ────────────────────────────────────────────────────────
  'components/layout/index.ts': `
export { ServerRail } from "./ServerRail";
export { ChannelSidebar } from "./ChannelSidebar";
export { MemberList } from "./MemberList";
export { MainLayout } from "./MainLayout";
`,

  'components/chat/index.ts': `
export { ChatArea } from "./ChatArea";
export { MessageItem } from "./MessageItem";
export { MessageInput } from "./MessageInput";
`,
};

// Write all files
let fileCount = 0;
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(basePath, filePath);
  const dir = path.dirname(fullPath);
  
  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });
  
  // Write file
  fs.writeFileSync(fullPath, content.trim() + '\n');
  fileCount++;
  console.log(\`✓ Created: \${filePath}\`);
});

console.log(\`\\n✅ Generated \${fileCount} source files!\`);
console.log('\\nNext steps:');
console.log('1. cd apps/web');
console.log('2. Install zustand: npm install zustand');
console.log('3. npm run dev');
