import { create } from 'zustand'
import {
  apiFetch,
  clearStoredToken,
  getStoredToken,
  readApiData,
  readApiError,
  setStoredToken,
} from '../lib/api'
import { normalizeUser, normalizeWorkspace } from '../lib/normalizers'

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  customStatus?: string
  createdAt: string
  role?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  iconUrl?: string
  ownerId: string
  plan: 'community' | 'plus' | 'pro' | 'enterprise'
}

interface AuthState {
  token: string | null
  user: User | null
  workspaces: Workspace[]
  isAuthenticated: boolean
  isLoading: boolean

  setToken: (token: string) => void
  setUser: (user: User) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  logout: () => void
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, username: string, password: string) => Promise<boolean>
  fetchCurrentUser: () => Promise<void>
  fetchWorkspaces: () => Promise<void>
}

const legacyToken =
  typeof window !== 'undefined' ? window.localStorage.getItem('nexus_token') : null
const initialToken = getStoredToken() || legacyToken

if (legacyToken && !getStoredToken()) {
  setStoredToken(legacyToken)
  window.localStorage.removeItem('nexus_token')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  user: null,
  workspaces: [],
  isAuthenticated: Boolean(initialToken),
  isLoading: false,

  setToken: (token) => {
    setStoredToken(token)
    set({ token, isAuthenticated: true })
  },

  setUser: (user) => set({ user }),

  setWorkspaces: (workspaces) => set({ workspaces }),

  logout: () => {
    clearStoredToken()
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('nexus_token')
    }
    set({ token: null, user: null, workspaces: [], isAuthenticated: false })
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const response = await apiFetch(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        { auth: false }
      )

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const data = await readApiData<{ token: string; user: Record<string, unknown> }>(response)
      const user = normalizeUser(data.user)
      if (!user) {
        throw new Error('Login response did not include a valid user')
      }

      get().setToken(data.token)
      get().setUser(user)
      await get().fetchWorkspaces()
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true })
    try {
      const response = await apiFetch(
        '/api/v1/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, username, password }),
        },
        { auth: false }
      )

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const data = await readApiData<{ token: string; user: Record<string, unknown> }>(response)
      const user = normalizeUser(data.user)
      if (!user) {
        throw new Error('Registration response did not include a valid user')
      }

      get().setToken(data.token)
      get().setUser(user)
      await get().fetchWorkspaces()
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCurrentUser: async () => {
    const { token } = get()
    if (!token) return

    try {
      const response = await apiFetch('/api/v1/users/@me')
      if (!response.ok) {
        if (response.status === 401) {
          get().logout()
        }
        return
      }

      const data = await readApiData<Record<string, unknown>>(response)
      const user = normalizeUser(data)
      if (user) {
        set({ user })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  },

  fetchWorkspaces: async () => {
    const { token } = get()
    if (!token) return

    try {
      const response = await apiFetch('/api/v1/workspaces/@me')
      if (!response.ok) {
        if (response.status === 401) {
          get().logout()
        }
        return
      }

      const data = await readApiData<Record<string, unknown>[]>(response)
      set({ workspaces: (data || []).map((workspace) => normalizeWorkspace(workspace)) })
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
    }
  },
}))
