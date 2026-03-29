#!/usr/bin/env node
/**
 * Nexus Frontend Components - Part 8
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

console.log('🚀 Nexus Frontend Components\n');

// Pages
writeFile('apps/web/src/pages/LoginPage.tsx', `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error is already in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-tertiary">
      <div className="w-full max-w-md p-8 bg-background-secondary rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome back!</h1>
        <p className="text-text-muted text-center mb-6">We're excited to see you again!</p>

        {error && (
          <div className="mb-4 p-3 bg-status-dnd/20 border border-status-dnd rounded text-status-dnd text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text-muted">
          Need an account?{' '}
          <Link to="/register" className="text-text-link hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}`);

writeFile('apps/web/src/pages/RegisterPage.tsx', `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, error, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, username, password);
      navigate('/');
    } catch {
      // Error is already in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-tertiary">
      <div className="w-full max-w-md p-8 bg-background-secondary rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Create an account</h1>

        {error && (
          <div className="mb-4 p-3 bg-status-dnd/20 border border-status-dnd rounded text-status-dnd text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers, and underscores only"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              minLength={8}
              required
            />
            <p className="text-xs text-text-muted mt-1">
              At least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>

        <p className="mt-4 text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-text-link hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}`);

writeFile('apps/web/src/pages/WelcomePage.tsx', `import { useWorkspaceStore } from '../stores/workspaceStore';

export function WelcomePage() {
  const { workspaces } = useWorkspaceStore();

  return (
    <div className="flex-1 flex items-center justify-center bg-background-primary">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Welcome to Nexus</h1>
        <p className="text-text-muted mb-6">
          {workspaces.length > 0
            ? 'Select a channel from the sidebar to start chatting'
            : 'Create or join a workspace to get started'}
        </p>
        <div className="flex gap-3 justify-center">
          <button className="btn btn-primary">
            Create Workspace
          </button>
          <button className="btn btn-secondary">
            Join Workspace
          </button>
        </div>
      </div>
    </div>
  );
}`);

writeFile('apps/web/src/pages/ChannelView.tsx', `import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useMessageStore } from '../stores/messageStore';
import { joinChannel, leaveChannel } from '../services/socket';
import { ChatArea } from '../components/chat/ChatArea';
import { MessageInput } from '../components/chat/MessageInput';
import { ChannelHeader } from '../components/chat/ChannelHeader';

export function ChannelView() {
  const { workspaceId, channelId } = useParams();
  const { currentWorkspace, currentChannel, selectWorkspace, selectChannel } = useWorkspaceStore();
  const { fetchMessages, setupSocketListeners } = useMessageStore();

  useEffect(() => {
    if (workspaceId && (!currentWorkspace || currentWorkspace.id !== workspaceId)) {
      selectWorkspace(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (channelId && currentWorkspace) {
      const channel = currentWorkspace.projects
        .flatMap(p => p.channels)
        .find(c => c.id === channelId);
      
      if (channel && channel.id !== currentChannel?.id) {
        selectChannel(channel);
      }
    }
  }, [channelId, currentWorkspace]);

  useEffect(() => {
    if (!currentChannel) return;

    fetchMessages(currentChannel.id);
    joinChannel(currentChannel.id);
    setupSocketListeners();

    return () => {
      leaveChannel(currentChannel.id);
    };
  }, [currentChannel?.id]);

  if (!currentChannel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background-primary">
      <ChannelHeader channel={currentChannel} />
      <ChatArea channelId={currentChannel.id} />
      <MessageInput channelId={currentChannel.id} />
    </div>
  );
}`);

writeFile('apps/web/src/pages/DMView.tsx', `import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Message, DirectMessageChannel } from '@nexus/shared';
import { dmApi } from '../services/api';
import { DMChatArea } from '../components/chat/DMChatArea';
import { DMMessageInput } from '../components/chat/DMMessageInput';

export function DMView() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState<DirectMessageChannel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;
    loadDM();
  }, [channelId]);

  const loadDM = async () => {
    if (!channelId) return;
    setIsLoading(true);
    try {
      // Load messages
      const msgs = await dmApi.getMessages(channelId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load DM:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!channelId) return;
    try {
      const message = await dmApi.sendMessage(channelId, content);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background-primary">
      <div className="h-12 px-4 flex items-center border-b border-background-tertiary">
        <span className="font-semibold">Direct Message</span>
      </div>
      <DMChatArea messages={messages} />
      <DMMessageInput onSend={handleSendMessage} />
    </div>
  );
}`);

// Layout Components
writeFile('apps/web/src/components/layout/MainLayout.tsx', `import { useEffect } from 'react';
import { WorkspaceSidebar } from '../sidebar/WorkspaceSidebar';
import { ChannelSidebar } from '../sidebar/ChannelSidebar';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { fetchWorkspaces, workspaces, selectWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (workspaces.length > 0) {
      selectWorkspace(workspaces[0].id);
    }
  }, [workspaces]);

  return (
    <div className="flex h-screen">
      <WorkspaceSidebar />
      <ChannelSidebar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}`);

// Sidebar Components
writeFile('apps/web/src/components/sidebar/WorkspaceSidebar.tsx', `import { useState } from 'react';
import { Plus, Compass } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { clsx } from 'clsx';

export function WorkspaceSidebar() {
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="w-[72px] bg-background-tertiary flex flex-col items-center py-3 gap-2">
      {/* Home button */}
      <button className="w-12 h-12 rounded-2xl bg-background-primary hover:bg-brand hover:rounded-xl transition-all flex items-center justify-center text-text-normal hover:text-white">
        <svg width="28" height="20" viewBox="0 0 28 20">
          <path fill="currentColor" d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4062 0.461742 17.1749 0.934541 16.9708 1.4184C15.003 1.12145 12.9974 1.12145 11.0283 1.4184C10.819 0.934541 10.589 0.461744 10.3368 0C8.48074 0.31879 6.67993 0.879834 4.96944 1.67671C1.56727 6.77772 0.649666 11.7389 1.11108 16.6244C3.10102 18.123 5.3262 19.2639 7.69177 20C8.22338 19.2743 8.69519 18.5043 9.09812 17.698C8.32996 17.4024 7.58522 17.0448 6.87684 16.6252C7.07094 16.4848 7.25713 16.3387 7.4344 16.1926C11.7308 18.2076 16.3387 18.2076 20.5765 16.1926C20.7625 16.3387 20.9487 16.4848 21.1428 16.6252C20.4281 17.0448 19.6834 17.4024 18.9083 17.698C19.3112 18.5043 19.783 19.2743 20.3146 20C22.6802 19.2639 24.9054 18.123 26.8954 16.6244C27.4418 10.9221 25.9557 6.01152 23.0212 1.67671Z" />
        </svg>
      </button>

      <div className="w-8 h-0.5 bg-background-primary rounded-full my-1" />

      {/* Workspace list */}
      {workspaces.map((workspace) => (
        <button
          key={workspace.id}
          onClick={() => selectWorkspace(workspace.id)}
          className={clsx(
            'w-12 h-12 rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-lg font-semibold',
            currentWorkspace?.id === workspace.id
              ? 'bg-brand text-white rounded-xl'
              : 'bg-background-primary text-text-normal hover:bg-brand hover:text-white'
          )}
          title={workspace.name}
        >
          {workspace.iconUrl ? (
            <img src={workspace.iconUrl} alt="" className="w-full h-full rounded-inherit object-cover" />
          ) : (
            workspace.name.substring(0, 2).toUpperCase()
          )}
        </button>
      ))}

      {/* Add workspace button */}
      <button
        onClick={() => setIsCreating(true)}
        className="w-12 h-12 rounded-2xl bg-background-primary hover:bg-status-online hover:rounded-xl transition-all flex items-center justify-center text-status-online hover:text-white"
        title="Add a Server"
      >
        <Plus size={24} />
      </button>

      {/* Explore servers */}
      <button
        className="w-12 h-12 rounded-2xl bg-background-primary hover:bg-status-online hover:rounded-xl transition-all flex items-center justify-center text-status-online hover:text-white"
        title="Explore Discoverable Servers"
      >
        <Compass size={24} />
      </button>
    </div>
  );
}`);

writeFile('apps/web/src/components/sidebar/ChannelSidebar.tsx', `import { useNavigate } from 'react-router-dom';
import { Hash, Volume2, ChevronDown, Settings, Plus, Mic, Headphones, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

export function ChannelSidebar() {
  const navigate = useNavigate();
  const { currentWorkspace, currentChannel, selectChannel } = useWorkspaceStore();
  const { user, logout } = useAuthStore();

  const handleChannelClick = (channel: any) => {
    selectChannel(channel);
    navigate(\`/channels/\${currentWorkspace!.id}/\${channel.id}\`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!currentWorkspace) {
    return (
      <div className="w-60 bg-background-secondary flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-background-tertiary">
          <span className="text-text-muted">Select a workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-background-secondary flex flex-col">
      {/* Workspace header */}
      <button className="h-12 px-4 flex items-center justify-between border-b border-background-tertiary hover:bg-background-primary transition-colors">
        <span className="font-semibold truncate">{currentWorkspace.name}</span>
        <ChevronDown size={18} className="text-text-muted" />
      </button>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {currentWorkspace.projects?.map((project) => (
          <div key={project.id} className="mb-4">
            <div className="flex items-center gap-1 px-1 mb-1 text-xs font-semibold text-text-muted uppercase hover:text-text-normal cursor-pointer">
              <ChevronDown size={12} />
              <span>{project.name}</span>
              <button className="ml-auto opacity-0 group-hover:opacity-100">
                <Plus size={16} />
              </button>
            </div>

            {project.channels?.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={clsx(
                  'channel-item w-full',
                  currentChannel?.id === channel.id && 'active'
                )}
              >
                {channel.type === 'voice' ? (
                  <Volume2 size={18} />
                ) : (
                  <Hash size={18} />
                )}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User panel */}
      <div className="h-[52px] px-2 bg-background-floating flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-medium">
            {user?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-online border-[3px] border-background-floating" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user?.displayName}</div>
          <div className="text-xs text-text-muted truncate">Online</div>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 text-interactive-normal hover:text-interactive-hover hover:bg-background-primary rounded">
            <Mic size={18} />
          </button>
          <button className="p-1.5 text-interactive-normal hover:text-interactive-hover hover:bg-background-primary rounded">
            <Headphones size={18} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-interactive-normal hover:text-interactive-hover hover:bg-background-primary rounded"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}`);

console.log('\n✅ Pages and Sidebar components created!');
