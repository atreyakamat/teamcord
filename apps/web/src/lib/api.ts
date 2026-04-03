import { buildApiUrl } from './config'

export const TOKEN_STORAGE_KEY = 'teamcord_token'

interface ApiFetchOptions {
  auth?: boolean
}

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, options: ApiFetchOptions = {}) {
  const headers = new Headers(init.headers ?? {})
  const shouldAttachAuth = options.auth ?? true

  if (shouldAttachAuth) {
    const token = getStoredToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
  })
}

export async function readApiData<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json()
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T
  }

  return payload as T
}

export async function readApiError(response: Response) {
  try {
    const payload = await response.json()
    return payload?.error || payload?.message || 'Request failed'
  } catch {
    return response.statusText || 'Request failed'
  }
}
