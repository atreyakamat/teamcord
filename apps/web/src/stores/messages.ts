import { create } from 'zustand';

export interface MessageAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isBot?: boolean;
  roleColor?: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface MessageReaction {
  emoji: string;
  emojiId?: string;
  emojiAnimated?: boolean;
  count: number;
  userIds: string[];
  me?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: string;
  createdAt: string;
  editedAt?: string;
  edited?: boolean;
  replyToId?: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  author?: MessageAuthor;
  replyTo?: Message;
  pinned?: boolean;
}

interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  loading: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Partial<Message> & { id: string; channelId: string }) => void;
  removeMessage: (messageId: string, channelId: string) => void;
  addReaction: (messageId: string, channelId: string, reaction: MessageReaction, userId: string) => void;
  removeReaction: (messageId: string, channelId: string, emoji: string, userId: string) => void;
  setLoading: (channelId: string, loading: boolean) => void;
  setHasMore: (channelId: string, hasMore: boolean) => void;
  fetchMessages: (channelId: string, before?: string) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChannel: {},
  loading: {},
  hasMore: {},
  
  setMessages: (channelId, messages) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: messages,
    }
  })),
  
  addMessage: (message) => set((state) => {
    const channelMsgs = state.messagesByChannel[message.channelId] || [];
    // Prevent duplicates
    if (channelMsgs.some(m => m.id === message.id)) return state;
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [message.channelId]: [...channelMsgs, message].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      }
    };
  }),
  
  updateMessage: (message) => set((state) => {
    const channelMsgs = state.messagesByChannel[message.channelId] || [];
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [message.channelId]: channelMsgs.map(m => 
          m.id === message.id ? { ...m, ...message } : m
        ),
      }
    };
  }),
  
  removeMessage: (messageId, channelId) => set((state) => {
    const channelMsgs = state.messagesByChannel[channelId] || [];
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: channelMsgs.filter(m => m.id !== messageId),
      }
    };
  }),
  
  addReaction: (messageId, channelId, reaction, userId) => set((state) => {
    const channelMsgs = state.messagesByChannel[channelId] || [];
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: channelMsgs.map(m => {
          if (m.id !== messageId) return m;
          
          const existingIdx = m.reactions.findIndex(r => r.emoji === reaction.emoji);
          let newReactions: MessageReaction[];
          
          if (existingIdx >= 0) {
            // Update existing reaction
            newReactions = m.reactions.map((r, i) => {
              if (i !== existingIdx) return r;
              return {
                ...r,
                count: r.userIds.includes(userId) ? r.count : r.count + 1,
                userIds: r.userIds.includes(userId) ? r.userIds : [...r.userIds, userId],
              };
            });
          } else {
            // Add new reaction
            newReactions = [...m.reactions, { ...reaction, count: 1, userIds: [userId] }];
          }
          
          return { ...m, reactions: newReactions };
        }),
      }
    };
  }),
  
  removeReaction: (messageId, channelId, emoji, userId) => set((state) => {
    const channelMsgs = state.messagesByChannel[channelId] || [];
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: channelMsgs.map(m => {
          if (m.id !== messageId) return m;
          
          const newReactions = m.reactions
            .map(r => {
              if (r.emoji !== emoji) return r;
              return {
                ...r,
                count: r.count - 1,
                userIds: r.userIds.filter(id => id !== userId),
              };
            })
            .filter(r => r.count > 0);
          
          return { ...m, reactions: newReactions };
        }),
      }
    };
  }),
  
  setLoading: (channelId, loading) => set((state) => ({
    loading: { ...state.loading, [channelId]: loading }
  })),
  
  setHasMore: (channelId, hasMore) => set((state) => ({
    hasMore: { ...state.hasMore, [channelId]: hasMore }
  })),
  
  fetchMessages: async (channelId, before) => {
    const { loading, setLoading, setMessages, setHasMore, messagesByChannel } = get();
    
    if (loading[channelId]) return;
    setLoading(channelId, true);
    
    try {
      const url = new URL(`http://localhost:3001/api/v1/channels/${channelId}/messages`);
      if (before) url.searchParams.set('before', before);
      url.searchParams.set('limit', '50');
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch messages');
      
      const { data } = await res.json();
      const messages: Message[] = data || [];
      
      if (before) {
        // Prepend older messages
        const existing = messagesByChannel[channelId] || [];
        setMessages(channelId, [...messages, ...existing]);
      } else {
        setMessages(channelId, messages);
      }
      
      setHasMore(channelId, messages.length === 50);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(channelId, false);
    }
  },
}));
