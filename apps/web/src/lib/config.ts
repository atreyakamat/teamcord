import { z } from 'zod'

const fallbackOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

const fallbackWsUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/gateway`
    : 'ws://localhost:3002/gateway'

// Validate environment variables
const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL').optional(),
  VITE_GATEWAY_URL: z.string().url('VITE_GATEWAY_URL must be a valid URL').optional(),
  VITE_KEYCLOAK_URL: z.string().url('VITE_KEYCLOAK_URL must be a valid URL').optional(),
  VITE_KEYCLOAK_REALM: z.string().min(1, 'VITE_KEYCLOAK_REALM is required').optional(),
  VITE_KEYCLOAK_CLIENT_ID: z.string().min(1, 'VITE_KEYCLOAK_CLIENT_ID is required').optional(),
  VITE_VOICE_URL: z.string().url('VITE_VOICE_URL must be a valid URL').optional(),
  VITE_VOICE_SOCKET_PATH: z.string().optional(),
  VITE_SENTRY_DSN: z.string().url('VITE_SENTRY_DSN must be a valid URL').optional(),
})

try {
  const validatedEnv = envSchema.parse(import.meta.env)
  console.log('✅ Environment configuration validated')
} catch (error) {
  if (error instanceof z.ZodError) {
    console.warn('⚠️  Environment configuration warnings:')
    error.errors.forEach(err => {
      console.warn(`  ${err.path.join('.')}: ${err.message}`)
    })
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL || fallbackOrigin).replace(/\/$/, '')
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || fallbackWsUrl
export const VOICE_URL = import.meta.env.VITE_VOICE_URL || fallbackOrigin
export const VOICE_SOCKET_PATH = import.meta.env.VITE_VOICE_SOCKET_PATH || '/voice/socket.io'

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
