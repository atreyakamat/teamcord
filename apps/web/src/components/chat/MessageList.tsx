import { useEffect, useRef, useCallback } from 'react'
import { useMessageStore } from '../../stores/messages'
import { useChannelStore } from '../../stores/channels'
import { useGatewayStore } from '../../stores/gateway'
import Message from './Message'

const MessageList = () => {
  const selectedChannelId = useChannelStore((state) => state.selectedChannelId)
  const messagesByChannel = useMessageStore((state) => state.messagesByChannel)
  const loading = useMessageStore((state) => state.loading)
  const hasMore = useMessageStore((state) => state.hasMore)
  const fetchMessages = useMessageStore((state) => state.fetchMessages)
  const connect = useGatewayStore((state) => state.connect)
  const subscribeChannel = useGatewayStore((state) => state.subscribeChannel)
  
  const listRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Connect to gateway on mount
  useEffect(() => {
    connect()
  }, [connect])

  // Fetch messages and subscribe when channel changes
  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages(selectedChannelId)
      subscribeChannel(selectedChannelId)
    }
  }, [selectedChannelId, fetchMessages, subscribeChannel])

  // Infinite scroll - load more when scrolling to top
  const handleScroll = useCallback(() => {
    if (!listRef.current || !selectedChannelId) return
    
    const { scrollTop } = listRef.current
    if (scrollTop < 100 && hasMore[selectedChannelId] && !loading[selectedChannelId]) {
      const messages = messagesByChannel[selectedChannelId] || []
      if (messages.length > 0) {
        fetchMessages(selectedChannelId, messages[0].id)
      }
    }
  }, [selectedChannelId, hasMore, loading, messagesByChannel, fetchMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = listRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }
  }, [messagesByChannel, selectedChannelId])

  const messages = selectedChannelId ? (messagesByChannel[selectedChannelId] || []) : []
  const isLoading = selectedChannelId ? loading[selectedChannelId] : false

  // Group messages by author and time (messages within 7 minutes of each other)
  const groupedMessages = messages.reduce((groups, message, index) => {
    const prevMessage = messages[index - 1]
    const isGrouped = prevMessage && 
      prevMessage.authorId === message.authorId &&
      new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 7 * 60 * 1000

    groups.push({ message, isGrouped })
    return groups
  }, [] as { message: typeof messages[0]; isGrouped: boolean }[])

  return (
    <div 
      ref={listRef}
      className="flex flex-col overflow-y-auto px-0 pb-4"
      onScroll={handleScroll}
    >
      {/* Load more indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-dc-blurple border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <div className="text-6xl mb-4">👋</div>
          <h3 className="text-2xl font-bold text-white mb-2">Welcome to the channel!</h3>
          <p className="text-dc-muted">This is the beginning of the conversation. Be the first to say hello!</p>
        </div>
      )}

      {/* Messages */}
      {groupedMessages.map(({ message, isGrouped }) => (
        <Message
          key={message.id}
          message={message}
          isGrouped={isGrouped}
          onReply={(msg) => {
            // Could implement reply functionality
            console.log('Reply to:', msg)
          }}
        />
      ))}

      {/* Bottom padding for scroll */}
      <div className="h-6" />
    </div>
  )
}

export default MessageList
