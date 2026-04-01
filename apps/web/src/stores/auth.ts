import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  ownerId: string;
  plan: 'community' | 'plus' | 'pro' | 'enterprise';
}

interface AuthState {
  token: string | null;
  user: User | null;
  workspaces: Workspace[];
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  fetchCurrentUser: () => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('nexus_token') || null,
  user: null,
  workspaces: [],
  isAuthenticated: !!localStorage.getItem('nexus_token'),
  isLoading: false,
  
  setToken: (token: string) => {
    localStorage.setItem('nexus_token', token);
    set({ token, isAuthenticated: true });
  },
  
  setUser: (user: User) => set({ user }),
  
  setWorkspaces: (workspaces: Workspace[]) => set({ workspaces }),
  
  logout: () => {
    localStorage.removeItem('nexus_token');
    set({ token: null, user: null, workspaces: [], isAuthenticated: false });
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const { data } = await res.json();
      get().setToken(data.token);
      get().setUser(data.user);
      
      // Fetch workspaces after login
      await get().fetchWorkspaces();
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      const { data } = await res.json();
      get().setToken(data.token);
      get().setUser(data.user);
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/users/@me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          get().logout();
        }
        return;
      }
      
      const { data } = await res.json();
      set({ user: data });
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  },
  
  fetchWorkspaces: async () => {
    const { token } = get();
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/workspaces/@me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) return;
      
      const { data } = await res.json();
      set({ workspaces: data || [] });
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  },
}));
