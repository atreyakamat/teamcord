import { create } from 'zustand'
import {
  apiFetch,
  clearStoredToken,
  getStoredToken,
  readApiData,
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
  login: (_email?: string, _password?: string) => Promise<boolean>
  register: (_email?: string, _username?: string, _password?: string) => Promise<boolean>
  handleCallback: () => Promise<boolean>
  refreshSession: () => Promise<boolean>
  fetchCurrentUser: () => Promise<void>
  fetchWorkspaces: () => Promise<void>
}

interface KeycloakTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080').replace(/\/$/, '')
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'teamcord'
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'teamcord-web'

const REFRESH_TOKEN_STORAGE_KEY = 'teamcord_refresh_token'
const TOKEN_EXPIRES_AT_STORAGE_KEY = 'teamcord_token_expires_at'
const OIDC_STATE_KEY = 'teamcord_oidc_state'
const OIDC_VERIFIER_KEY = 'teamcord_oidc_verifier'

const legacyToken =
  typeof window !== 'undefined' ? window.localStorage.getItem('nexus_token') : null
const initialToken = getStoredToken() || legacyToken

if (legacyToken && !getStoredToken()) {
  setStoredToken(legacyToken)
  window.localStorage.removeItem('nexus_token')
}

function getTokenEndpoint() {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
}

function getAuthEndpoint() {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`
}

function getLogoutEndpoint() {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`
}

function getRedirectUri() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/app'
  }
  return `${window.location.origin}/app`
}

function setRefreshToken(refreshToken: string | null) {
  if (typeof window === 'undefined') return
  if (!refreshToken) {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

function setTokenExpiry(expiresAt: number | null) {
  if (typeof window === 'undefined') return
  if (!expiresAt) {
    window.localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt))
}

function getTokenExpiry() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function isTokenExpiringSoon() {
  const expiresAt = getTokenExpiry()
  if (!expiresAt) return false
  return expiresAt - Date.now() < 60_000
}

function randomString(bytes = 32) {
  const values = new Uint8Array(bytes)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes: Uint8Array) {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function buildPkceChallenge(verifier: string) {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return toBase64Url(new Uint8Array(digest))
}

let refreshTimer: number | null = null

function clearRefreshTimer() {
  if (typeof window === 'undefined') return
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleRefresh() {
  if (typeof window === 'undefined') return
  clearRefreshTimer()
  const expiresAt = getTokenExpiry()
  if (!expiresAt) return

  const delay = Math.max(expiresAt - Date.now() - 60_000, 5_000)
  refreshTimer = window.setTimeout(() => {
    useAuthStore
      .getState()
      .refreshSession()
      .catch((error) => console.error('Failed to refresh OIDC session:', error))
  }, delay)
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(getTokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    throw new Error('Failed to exchange OAuth token')
  }
  return (await response.json()) as KeycloakTokenResponse
}

function applyTokenResponse(payload: KeycloakTokenResponse) {
  const expiresAt = Date.now() + payload.expires_in * 1000
  setStoredToken(payload.access_token)
  setRefreshToken(payload.refresh_token || null)
  setTokenExpiry(expiresAt)
  scheduleRefresh()
  return {
    token: payload.access_token,
    expiresAt,
  }
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
    scheduleRefresh()
  },

  setUser: (user) => set({ user }),

  setWorkspaces: (workspaces) => set({ workspaces }),

  logout: () => {
    clearRefreshTimer()
    clearStoredToken()
    setRefreshToken(null)
    setTokenExpiry(null)
    set({ token: null, user: null, workspaces: [], isAuthenticated: false })
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('nexus_token')
      const logoutUrl = new URL(getLogoutEndpoint())
      logoutUrl.searchParams.set('client_id', KEYCLOAK_CLIENT_ID)
      logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin)
      window.location.assign(logoutUrl.toString())
    }
  },

  login: async () => {
    if (typeof window === 'undefined') {
      return false
    }

    set({ isLoading: true })
    try {
      const state = randomString(24)
      const verifier = randomString(64)
      const challenge = await buildPkceChallenge(verifier)

      window.sessionStorage.setItem(OIDC_STATE_KEY, state)
      window.sessionStorage.setItem(OIDC_VERIFIER_KEY, verifier)

      const redirectUrl = new URL(getAuthEndpoint())
      redirectUrl.searchParams.set('response_type', 'code')
      redirectUrl.searchParams.set('client_id', KEYCLOAK_CLIENT_ID)
      redirectUrl.searchParams.set('redirect_uri', getRedirectUri())
      redirectUrl.searchParams.set('scope', 'openid profile email')
      redirectUrl.searchParams.set('state', state)
      redirectUrl.searchParams.set('code_challenge', challenge)
      redirectUrl.searchParams.set('code_challenge_method', 'S256')

      window.location.assign(redirectUrl.toString())
      return true
    } catch (error) {
      console.error('Failed to start OIDC login:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  register: async () => {
    return get().login()
  },

  handleCallback: async () => {
    if (typeof window === 'undefined') return false

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')
    if (error) {
      console.error('OIDC callback error:', error, params.get('error_description'))
      return false
    }
    if (!code || !state) {
      return false
    }

    set({ isLoading: true })
    try {
      const expectedState = window.sessionStorage.getItem(OIDC_STATE_KEY)
      const verifier = window.sessionStorage.getItem(OIDC_VERIFIER_KEY)
      if (!expectedState || !verifier || expectedState !== state) {
        throw new Error('Invalid OIDC callback state')
      }

      window.sessionStorage.removeItem(OIDC_STATE_KEY)
      window.sessionStorage.removeItem(OIDC_VERIFIER_KEY)

      const payload = await exchangeToken(
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KEYCLOAK_CLIENT_ID,
          code,
          redirect_uri: getRedirectUri(),
          code_verifier: verifier,
        })
      )

      const session = applyTokenResponse(payload)
      set({ token: session.token, isAuthenticated: true })

      window.history.replaceState({}, '', '/app')
      await get().fetchCurrentUser()
      await get().fetchWorkspaces()
      return true
    } catch (callbackError) {
      console.error('Failed to complete OIDC callback:', callbackError)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  refreshSession: async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return false
    }

    try {
      const payload = await exchangeToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KEYCLOAK_CLIENT_ID,
          refresh_token: refreshToken,
        })
      )
      const session = applyTokenResponse(payload)
      set({ token: session.token, isAuthenticated: true })
      return true
    } catch (error) {
      console.error('Session refresh failed:', error)
      clearRefreshTimer()
      clearStoredToken()
      setRefreshToken(null)
      setTokenExpiry(null)
      set({ token: null, user: null, workspaces: [], isAuthenticated: false })
      return false
    }
  },

  fetchCurrentUser: async () => {
    const { token } = get()
    if (!token) return

    if (isTokenExpiringSoon()) {
      await get().refreshSession()
    }

    try {
      const response = await apiFetch('/api/v1/users/@me')
      if (!response.ok) {
        if (response.status === 401) {
          await get().refreshSession()
          const retryResponse = await apiFetch('/api/v1/users/@me')
          if (!retryResponse.ok) {
            return
          }
          const retryData = await readApiData<Record<string, unknown>>(retryResponse)
          const retryUser = normalizeUser(retryData)
          if (retryUser) {
            set({ user: retryUser })
          }
          return
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

    if (isTokenExpiringSoon()) {
      await get().refreshSession()
    }

    try {
      const response = await apiFetch('/api/v1/workspaces/@me')
      if (!response.ok) {
        if (response.status === 401) {
          await get().refreshSession()
          return
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

if (typeof window !== 'undefined' && initialToken && getTokenExpiry()) {
  scheduleRefresh()
}
