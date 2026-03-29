import { create } from 'zustand';

export interface Message {
  id: number;
  channel_id: number;
  author_id: number;
  content: string;
  created_at: string;
  author?: {
    username: string;
    avatar_url: string;
  }
}

interface MessageState {
  messagesByChannel: Record<number, Message[]>;
  setMessages: (channelId: number, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: number, channelId: number) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByChannel: {},
  setMessages: (channelId, messages) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: messages,
    }
  })),
  addMessage: (message) => set((state) => {
    const channelMsgs = state.messagesByChannel[message.channel_id] || [];
    // Prevent duplicates
    if (channelMsgs.some(m => m.id === message.id)) return state;
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [message.channel_id]: [...channelMsgs, message].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }
    };
  }),
  updateMessage: (message) => set((state) => {
    const channelMsgs = state.messagesByChannel[message.channel_id] || [];
    return {
      messagesByChannel: {
        ...state.messagesByChannel,
        [message.channel_id]: channelMsgs.map(m => m.id === message.id ? { ...m, ...message } : m),
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
  })
}));
