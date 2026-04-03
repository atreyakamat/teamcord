import { create } from 'zustand'
import { apiFetch, readApiData } from '../lib/api'
import { normalizeChannel } from '../lib/normalizers'

export interface Channel {
  id: string
  workspaceId: string
  name: string
  description?: string
  type:
    | 'category'
    | 'text'
    | 'voice'
    | 'video'
    | 'stage'
    | 'forum'
    | 'announcement'
    | 'client-portal'
    | 'dm'
  isPrivate: boolean
  position: number
  parentId?: string
  createdAt: string
  participantIds?: string[]
}

export interface Category {
  id: string
  name: string
  position: number
  channels: Channel[]
}

interface TypingUser {
  userId: string
  username: string
  timestamp: number
}

interface ChannelState {
  channels: Channel[]
  categories: Category[]
  selectedChannelId: string | null
  activeVoiceChannelId: string | null
  selectedWorkspaceId: string | null
  typingUsers: Record<string, TypingUser[]>

  setChannels: (channels: Channel[]) => void
  setCategories: (categories: Category[]) => void
  setSelectedChannel: (id: string | null) => void
  setActiveVoiceChannel: (id: string | null) => void
  setSelectedWorkspace: (id: string | null) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channel: Partial<Channel> & { id: string }) => void
  removeChannel: (id: string) => void
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void
  fetchChannels: (workspaceId: string) => Promise<void>
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  categories: [],
  selectedChannelId: null,
  activeVoiceChannelId: null,
  selectedWorkspaceId: null,
  typingUsers: {},

  setChannels: (channels) => set({ channels }),

  setCategories: (categories) => set({ categories }),

  setSelectedChannel: (id) => set({ selectedChannelId: id }),

  setActiveVoiceChannel: (id) => set({ activeVoiceChannelId: id }),

  setSelectedWorkspace: (id) =>
    set({
      selectedWorkspaceId: id,
      selectedChannelId: null,
      activeVoiceChannelId: null,
    }),

  addChannel: (channel) =>
    set((state) => {
      const existing = state.channels.some((entry) => entry.id === channel.id)
      const nextChannels = existing
        ? state.channels.map((entry) => (entry.id === channel.id ? channel : entry))
        : [...state.channels, channel]

      return {
        channels: nextChannels.sort((left, right) => left.position - right.position),
      }
    }),

  updateChannel: (channel) =>
    set((state) => ({
      channels: state.channels.map((entry) =>
        entry.id === channel.id ? { ...entry, ...channel } : entry
      ),
    })),

  removeChannel: (id) =>
    set((state) => ({
      channels: state.channels.filter((entry) => entry.id !== id),
      selectedChannelId: state.selectedChannelId === id ? null : state.selectedChannelId,
      activeVoiceChannelId: state.activeVoiceChannelId === id ? null : state.activeVoiceChannelId,
    })),

  setTyping: (channelId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[channelId] || []

      if (isTyping) {
        const existing = current.find((user) => user.userId === userId)
        if (existing) {
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: current.map((user) =>
                user.userId === userId ? { ...user, timestamp: Date.now() } : user
              ),
            },
          }
        }

        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: [...current, { userId, username: userId, timestamp: Date.now() }],
          },
        }
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: current.filter((user) => user.userId !== userId),
        },
      }
    }),

  fetchChannels: async (workspaceId) => {
    try {
      const response = await apiFetch(`/api/v1/workspaces/${workspaceId}/channels`)
      if (!response.ok) {
        throw new Error('Failed to fetch channels')
      }

      const data = await readApiData<Record<string, unknown>[]>(response)
      const allChannels = (data || []).map((channel) => normalizeChannel(channel)) as Channel[]

      const categoriesMap = new Map<string, Category>()
      allChannels.forEach((channel) => {
        if (channel.type === 'category') {
          categoriesMap.set(channel.id, {
            id: channel.id,
            name: channel.name,
            position: channel.position,
            channels: [],
          })
        }
      })

      allChannels.forEach((channel) => {
        if (channel.type !== 'category' && channel.parentId && categoriesMap.has(channel.parentId)) {
          categoriesMap.get(channel.parentId)?.channels.push(channel)
        }
      })

      categoriesMap.forEach((category) => {
        category.channels.sort((left, right) => left.position - right.position)
      })

      const categories = Array.from(categoriesMap.values()).sort(
        (left, right) => left.position - right.position
      )
      const channels = allChannels.filter((channel) => channel.type !== 'category')

      set({
        channels,
        categories,
        selectedWorkspaceId: workspaceId,
      })

      const { selectedChannelId } = get()
      const hasSelectedChannel = selectedChannelId
        ? channels.some((channel) => channel.id === selectedChannelId)
        : false

      if (!hasSelectedChannel) {
        const fallbackChannel =
          channels.find((channel) => channel.type === 'text') ||
          channels.find((channel) => channel.type === 'dm') ||
          channels.find((channel) => channel.type !== 'voice') ||
          channels[0] ||
          null

        set({ selectedChannelId: fallbackChannel?.id ?? null })
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    }
  },
}))
