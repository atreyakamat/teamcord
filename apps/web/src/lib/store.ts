import { create } from "zustand";
import type { User, Workspace, Channel, Message } from "@teamcord/types";

interface AppState {
  // Auth
  token: string | null;
  user: User | null;

  // Navigation
  activeWorkspace: Workspace | null;
  activeChannel: Channel | null;

  // Data
  messages: Message[];

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("tc_token") : null,
  user: null,
  activeWorkspace: null,
  activeChannel: null,
  messages: [],

  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("tc_token", token);
      else localStorage.removeItem("tc_token");
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  setActiveWorkspace: (workspace) =>
    set({ activeWorkspace: workspace, activeChannel: null, messages: [] }),

  setActiveChannel: (channel) => set({ activeChannel: channel, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("tc_token");
    set({ token: null, user: null, activeWorkspace: null, activeChannel: null, messages: [] });
  },
}));
