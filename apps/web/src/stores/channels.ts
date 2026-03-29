import { create } from 'zustand';

interface Channel {
  id: number;
  name: string;
  type: string;
}

interface ChannelState {
  channels: Channel[];
  selectedChannelId: number | null;
  setChannels: (channels: Channel[]) => void;
  setSelectedChannel: (id: number) => void;
}

export const useChannelStore = create<ChannelState>((set) => ({
  channels: [
    { id: 1, name: 'announcements', type: 'text' },
    { id: 2, name: 'general', type: 'text' }
  ],
  selectedChannelId: 1,
  setChannels: (channels) => set({ channels }),
  setSelectedChannel: (id) => set({ selectedChannelId: id }),
}));
