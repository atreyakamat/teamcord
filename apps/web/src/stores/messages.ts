import { create } from 'zustand'
import { apiFetch, readApiData } from '../lib/api'
import { normalizeMessage } from '../lib/normalizers'

export interface MessageAuthor {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  isBot?: boolean
  roleColor?: string
}

export interface MessageAttachment {
  id: string
  url: string
  filename: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

export interface MessageReaction {
  emoji: string
  emojiId?: string
  emojiAnimated?: boolean
  count: number
  userIds: string[]
  me?: boolean
}

export interface Message {
  id: string
  channelId: string
  authorId: string
  content: string
  type: string
  createdAt: string
  editedAt?: string
  edited?: boolean
  replyToId?: string
  attachments: MessageAttachment[]
  reactions: MessageReaction[]
  author?: MessageAuthor
  replyTo?: Message
  pinned?: boolean
}

interface MessageState {
  messagesByChannel: Record<string, Message[]>
  loading: Record<string, boolean>
  hasMore: Record<string, boolean>

  setMessages: (channelId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (message: Partial<Message> & { id: string; channelId: string }) => void
  removeMessage: (messageId: string, channelId: string) => void
  addReaction: (messageId: string, channelId: string, reaction: MessageReaction, userId: string) => void
  removeReaction: (messageId: string, channelId: string, emoji: string, userId: string) => void
  setLoading: (channelId: string, loading: boolean) => void
  setHasMore: (channelId: string, hasMore: boolean) => void
  fetchMessages: (channelId: string, before?: string) => Promise<void>
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChannel: {},
  loading: {},
  hasMore: {},

  setMessages: (channelId, messages) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: messages,
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const channelMessages = state.messagesByChannel[message.channelId] || []
      if (channelMessages.some((entry) => entry.id === message.id)) {
        return state
      }

      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: [...channelMessages, message].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          ),
        },
      }
    }),

  updateMessage: (message) =>
    set((state) => {
      const channelMessages = state.messagesByChannel[message.channelId] || []
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: channelMessages.map((entry) =>
            entry.id === message.id ? { ...entry, ...message } : entry
          ),
        },
      }
    }),

  removeMessage: (messageId, channelId) =>
    set((state) => {
      const channelMessages = state.messagesByChannel[channelId] || []
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: channelMessages.filter((entry) => entry.id !== messageId),
        },
      }
    }),

  addReaction: (messageId, channelId, reaction, userId) =>
    set((state) => {
      const channelMessages = state.messagesByChannel[channelId] || []
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: channelMessages.map((message) => {
            if (message.id !== messageId) {
              return message
            }

            const existingIndex = message.reactions.findIndex(
              (entry) => entry.emoji === reaction.emoji
            )

            if (existingIndex >= 0) {
              return {
                ...message,
                reactions: message.reactions.map((entry, index) => {
                  if (index !== existingIndex) {
                    return entry
                  }

                  const hasUser = entry.userIds.includes(userId)
                  return {
                    ...entry,
                    count: hasUser ? entry.count : entry.count + 1,
                    userIds: hasUser ? entry.userIds : [...entry.userIds, userId],
                  }
                }),
              }
            }

            return {
              ...message,
              reactions: [...message.reactions, { ...reaction, count: 1, userIds: [userId] }],
            }
          }),
        },
      }
    }),

  removeReaction: (messageId, channelId, emoji, userId) =>
    set((state) => {
      const channelMessages = state.messagesByChannel[channelId] || []
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: channelMessages.map((message) => {
            if (message.id !== messageId) {
              return message
            }

            return {
              ...message,
              reactions: message.reactions
                .map((entry) => {
                  if (entry.emoji !== emoji) {
                    return entry
                  }

                  return {
                    ...entry,
                    count: entry.count - 1,
                    userIds: entry.userIds.filter((entryUserId) => entryUserId !== userId),
                  }
                })
                .filter((entry) => entry.count > 0),
            }
          }),
        },
      }
    }),

  setLoading: (channelId, loading) =>
    set((state) => ({
      loading: { ...state.loading, [channelId]: loading },
    })),

  setHasMore: (channelId, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [channelId]: hasMore },
    })),

  fetchMessages: async (channelId, before) => {
    const { loading, messagesByChannel, setHasMore, setLoading, setMessages } = get()
    if (loading[channelId]) {
      return
    }

    setLoading(channelId, true)

    try {
      const searchParams = new URLSearchParams({ limit: '50' })
      if (before) {
        searchParams.set('before', before)
      }

      const response = await apiFetch(`/api/v1/channels/${channelId}/messages?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await readApiData<Record<string, unknown>[]>(response)
      const messages = (data || [])
        .map((message) => normalizeMessage(message))
        .sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        ) as Message[]

      if (before) {
        const mergedMessages = [...messages, ...(messagesByChannel[channelId] || [])].filter(
          (message, index, list) => list.findIndex((entry) => entry.id === message.id) === index
        )
        setMessages(channelId, mergedMessages)
      } else {
        setMessages(channelId, messages)
      }

      setHasMore(channelId, messages.length === 50)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(channelId, false)
    }
  },
}))
