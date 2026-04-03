const fallbackOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

const fallbackWsUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/gateway`
    : 'ws://localhost:3002/gateway'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || fallbackOrigin).replace(/\/$/, '')
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || fallbackWsUrl
export const VOICE_URL = import.meta.env.VITE_VOICE_URL || fallbackOrigin
export const VOICE_SOCKET_PATH = import.meta.env.VITE_VOICE_SOCKET_PATH || '/voice/socket.io'

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
