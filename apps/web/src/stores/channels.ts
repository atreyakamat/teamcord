import { create } from 'zustand';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'video' | 'stage' | 'forum' | 'announcement' | 'client-portal';
  isPrivate: boolean;
  position: number;
  parentId?: string; // Category ID
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  channels: Channel[];
}

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

interface ChannelState {
  channels: Channel[];
  categories: Category[];
  selectedChannelId: string | null;
  activeVoiceChannelId: string | null;
  selectedWorkspaceId: string | null;
  typingUsers: Record<string, TypingUser[]>; // channelId -> users
  
  setChannels: (channels: Channel[]) => void;
  setCategories: (categories: Category[]) => void;
  setSelectedChannel: (id: string | null) => void;
  setActiveVoiceChannel: (id: string | null) => void;
  setSelectedWorkspace: (id: string | null) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channel: Partial<Channel> & { id: string }) => void;
  removeChannel: (id: string) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  fetchChannels: (workspaceId: string) => Promise<void>;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  categories: [],
  selectedChannelId: null,
  activeVoiceChannelId: null,
  selectedWorkspaceId: null,
  typingUsers: {},
  
  setChannels: (channels) => set({ channels }),
  
  setCategories: (categories) => set({ categories }),
  
  setSelectedChannel: (id) => set({ selectedChannelId: id }),

  setActiveVoiceChannel: (id) => set({ activeVoiceChannelId: id }),
  
  setSelectedWorkspace: (id) => set({ selectedWorkspaceId: id }),
  
  addChannel: (channel) => set((state) => ({
    channels: [...state.channels, channel].sort((a, b) => a.position - b.position)
  })),
  
  updateChannel: (channel) => set((state) => ({
    channels: state.channels.map(c => c.id === channel.id ? { ...c, ...channel } : c)
  })),
  
  removeChannel: (id) => set((state) => ({
    channels: state.channels.filter(c => c.id !== id),
    selectedChannelId: state.selectedChannelId === id ? null : state.selectedChannelId
  })),
  
  setTyping: (channelId, userId, isTyping) => set((state) => {
    const current = state.typingUsers[channelId] || [];
    
    if (isTyping) {
      // Add or update user
      const existing = current.find(u => u.userId === userId);
      if (existing) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: current.map(u => 
              u.userId === userId ? { ...u, timestamp: Date.now() } : u
            )
          }
        };
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...current, { userId, username: userId, timestamp: Date.now() }]
        }
      };
    } else {
      // Remove user
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: current.filter(u => u.userId !== userId)
        }
      };
    }
  }),
  
  fetchChannels: async (workspaceId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/v1/workspaces/${workspaceId}/channels`);
      if (!res.ok) throw new Error('Failed to fetch channels');
      
      const { data } = await res.json();
      const channels: Channel[] = data || [];
      
      // Organize into categories
      const categoriesMap = new Map<string, Category>();
      const uncategorized: Channel[] = [];
      
      channels.forEach(channel => {
        if (channel.type === 'category') {
          categoriesMap.set(channel.id, {
            id: channel.id,
            name: channel.name,
            position: channel.position,
            channels: []
          });
        }
      });
      
      channels.forEach(channel => {
        if (channel.type !== 'category') {
          if (channel.parentId && categoriesMap.has(channel.parentId)) {
            categoriesMap.get(channel.parentId)!.channels.push(channel);
          } else {
            uncategorized.push(channel);
          }
        }
      });
      
      // Sort channels within categories
      categoriesMap.forEach(cat => {
        cat.channels.sort((a, b) => a.position - b.position);
      });
      
      const categories = Array.from(categoriesMap.values()).sort((a, b) => a.position - b.position);
      
      set({ 
        channels: channels.filter(c => c.type !== 'category'),
        categories,
        selectedWorkspaceId: workspaceId
      });
      
      // Auto-select first text channel if none selected
      const { selectedChannelId } = get();
      if (!selectedChannelId) {
        const firstText = channels.find(c => c.type === 'text');
        if (firstText) {
          set({ selectedChannelId: firstText.id });
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  },
}));
