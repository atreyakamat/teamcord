import { useCallback, useEffect, useRef } from 'react'
import { useChannelStore } from '../../stores/channels'
import Message from './Message'
import { useGatewayStore } from '../../stores/gateway'
import { useMessageStore } from '../../stores/messages'

const MessageList = () => {
  const selectedChannelId = useChannelStore((state) => state.selectedChannelId)
  const messagesByChannel = useMessageStore((state) => state.messagesByChannel)
  const loading = useMessageStore((state) => state.loading)
  const hasMore = useMessageStore((state) => state.hasMore)
  const fetchMessages = useMessageStore((state) => state.fetchMessages)
  const connect = useGatewayStore((state) => state.connect)
  const subscribeChannel = useGatewayStore((state) => state.subscribeChannel)
  const unsubscribeChannel = useGatewayStore((state) => state.unsubscribeChannel)

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    if (!selectedChannelId) {
      return
    }

    fetchMessages(selectedChannelId)
    subscribeChannel(selectedChannelId)

    return () => {
      unsubscribeChannel(selectedChannelId)
    }
  }, [selectedChannelId, fetchMessages, subscribeChannel, unsubscribeChannel])

  const handleScroll = useCallback(() => {
    if (!listRef.current || !selectedChannelId) {
      return
    }

    const { scrollTop } = listRef.current
    if (scrollTop < 100 && hasMore[selectedChannelId] && !loading[selectedChannelId]) {
      const messages = messagesByChannel[selectedChannelId] || []
      if (messages.length > 0) {
        fetchMessages(selectedChannelId, messages[0].id)
      }
    }
  }, [fetchMessages, hasMore, loading, messagesByChannel, selectedChannelId])

  useEffect(() => {
    if (!listRef.current) {
      return
    }

    const { scrollHeight, scrollTop, clientHeight } = listRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

    if (isNearBottom) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messagesByChannel, selectedChannelId])

  const messages = selectedChannelId ? messagesByChannel[selectedChannelId] || [] : []
  const isLoading = selectedChannelId ? loading[selectedChannelId] : false

  const groupedMessages = messages.reduce((groups, message, index) => {
    const previousMessage = messages[index - 1]
    const isGrouped =
      Boolean(previousMessage) &&
      previousMessage.authorId === message.authorId &&
      new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime() <
        7 * 60 * 1000

    groups.push({ message, isGrouped })
    return groups
  }, [] as { message: (typeof messages)[number]; isGrouped: boolean }[])

  return (
    <div ref={listRef} className="flex flex-col overflow-y-auto px-0 pb-4" onScroll={handleScroll}>
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-dc-blurple border-t-transparent" />
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <div className="mb-4 text-6xl">...</div>
          <h3 className="mb-2 text-2xl font-bold text-white">Welcome to the channel</h3>
          <p className="text-dc-muted">
            This is the beginning of the conversation. Be the first to say hello.
          </p>
        </div>
      )}

      {groupedMessages.map(({ message, isGrouped }) => (
        <Message
          key={message.id}
          message={message}
          isGrouped={isGrouped}
          onReply={(replyMessage) => {
            console.log('Reply to:', replyMessage)
          }}
        />
      ))}

      <div className="h-6" />
    </div>
  )
}

export default MessageList
