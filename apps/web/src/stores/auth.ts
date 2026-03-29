import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('nexus_token') || null,
  user: null,
  isAuthenticated: !!localStorage.getItem('nexus_token'),
  setToken: (token: string) => {
    localStorage.setItem('nexus_token', token);
    set({ token, isAuthenticated: true });
  },
  setUser: (user: any) => set({ user }),
  logout: () => {
    localStorage.removeItem('nexus_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
