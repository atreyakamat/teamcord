import { create } from 'zustand'
import { GATEWAY_URL } from '../lib/config'
import { normalizeChannel, normalizeMessage, normalizeUser } from '../lib/normalizers'
import { useAuthStore } from './auth'
import { useChannelStore } from './channels'
import { useMessageStore } from './messages'

interface GatewayState {
  socket: WebSocket | null
  connected: boolean
  sessionId: string | null
  heartbeatInterval: number | null
  lastHeartbeat: number | null
  reconnectAttempts: number

  connect: () => void
  disconnect: () => void
  sendMessage: (op: number, d: unknown) => void
  subscribeChannel: (channelId: string) => void
  unsubscribeChannel: (channelId: string) => void
}

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000

export const useGatewayStore = create<GatewayState>((set, get) => ({
  socket: null,
  connected: false,
  sessionId: null,
  heartbeatInterval: null,
  lastHeartbeat: null,
  reconnectAttempts: 0,

  connect: () => {
    const token = useAuthStore.getState().token
    const { socket, reconnectAttempts } = get()

    if (!token || socket?.readyState === WebSocket.OPEN) {
      return
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      return
    }

    const ws = new WebSocket(GATEWAY_URL)

    ws.onopen = () => {
      set({ connected: true, socket: ws, reconnectAttempts: 0 })
      get().sendMessage(2, {
        token,
        properties: {
          os: navigator.platform,
          browser: 'teamcord-web',
          device: 'desktop',
        },
        compress: false,
        large_threshold: 250,
      })
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        handleDispatch(payload, get, set)
      } catch (error) {
        console.error('Failed to parse gateway message:', error)
      }
    }

    ws.onclose = (event) => {
      set({ connected: false, socket: null })

      const { heartbeatInterval } = get()
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        set({ heartbeatInterval: null })
      }

      if (!event.wasClean && useAuthStore.getState().token) {
        const attempts = get().reconnectAttempts + 1
        set({ reconnectAttempts: attempts })
        const delay = Math.min(BASE_RECONNECT_DELAY * 2 ** attempts, 30000)
        setTimeout(() => get().connect(), delay)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  },

  disconnect: () => {
    const { socket, heartbeatInterval } = get()
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    if (socket) {
      socket.close(1000, 'User disconnect')
    }

    set({
      connected: false,
      socket: null,
      heartbeatInterval: null,
      sessionId: null,
      lastHeartbeat: null,
    })
  },

  sendMessage: (op, d) => {
    const { socket } = get()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ op, d }))
    }
  },

  subscribeChannel: (channelId) => {
    get().sendMessage(100, { channel_id: channelId, channel_ids: [channelId] })
  },

  unsubscribeChannel: (channelId) => {
    get().sendMessage(101, { channel_id: channelId, channel_ids: [channelId] })
  },
}))

function handleDispatch(
  payload: { op: number; t?: string; d?: Record<string, unknown>; s?: number },
  get: () => GatewayState,
  set: (state: Partial<GatewayState>) => void
) {
  const { op, t, d, s } = payload

  switch (op) {
    case 10: {
      const interval = Number(d?.heartbeat_interval ?? 41250)
      const heartbeatTimer = window.setInterval(() => {
        get().sendMessage(1, { last_sequence: s || null })
        set({ lastHeartbeat: Date.now() })
      }, interval)

      set({ heartbeatInterval: heartbeatTimer })
      break
    }

    case 7:
      get().disconnect()
      setTimeout(() => get().connect(), 1000)
      break

    case 9: {
      const token = useAuthStore.getState().token
      if (!token) {
        get().disconnect()
        break
      }

      get().sendMessage(2, {
        token,
        properties: { os: 'web', browser: 'teamcord-web', device: 'desktop' },
      })
      break
    }

    case 0:
      if (t) {
        handleEvent(t, d || {})
      }
      break

    default:
      break
  }
}

function handleEvent(type: string, data: Record<string, unknown>) {
  const messageStore = useMessageStore.getState()
  const channelStore = useChannelStore.getState()
  const authStore = useAuthStore.getState()

  switch (type) {
    case 'READY': {
      const user = normalizeUser(data.user as Record<string, unknown>)
      if (user) {
        authStore.setUser(user)
      }

      if (typeof data.session_id === 'string') {
        useGatewayStore.setState({ sessionId: data.session_id })
      }
      break
    }

    case 'MESSAGE_CREATE':
      messageStore.addMessage(normalizeMessage(data))
      break

    case 'MESSAGE_UPDATE':
      messageStore.updateMessage(normalizeMessage(data))
      break

    case 'MESSAGE_DELETE':
      messageStore.removeMessage(String(data.id ?? ''), String(data.channel_id ?? data.channelId ?? ''))
      break

    case 'MESSAGE_REACTION_ADD':
      messageStore.addReaction(
        String(data.message_id ?? data.messageId ?? ''),
        String(data.channel_id ?? data.channelId ?? ''),
        {
          emoji: String(data.emoji ?? ''),
          count: 1,
          userIds: [],
        },
        String(data.user_id ?? data.userId ?? '')
      )
      break

    case 'MESSAGE_REACTION_REMOVE':
      messageStore.removeReaction(
        String(data.message_id ?? data.messageId ?? ''),
        String(data.channel_id ?? data.channelId ?? ''),
        String(data.emoji ?? ''),
        String(data.user_id ?? data.userId ?? '')
      )
      break

    case 'CHANNEL_CREATE':
      channelStore.addChannel(normalizeChannel(data))
      break

    case 'CHANNEL_UPDATE':
      channelStore.updateChannel(normalizeChannel(data))
      break

    case 'CHANNEL_DELETE':
      channelStore.removeChannel(String(data.id ?? ''))
      break

    case 'TYPING_START':
      channelStore.setTyping(
        String(data.channel_id ?? data.channelId ?? ''),
        String(data.user_id ?? data.userId ?? ''),
        true
      )
      setTimeout(() => {
        channelStore.setTyping(
          String(data.channel_id ?? data.channelId ?? ''),
          String(data.user_id ?? data.userId ?? ''),
          false
        )
      }, 10000)
      break

    default:
      break
  }
}
