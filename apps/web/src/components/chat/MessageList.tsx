import { useEffect, useState } from 'react'
import { Smile, Reply, Edit2, Trash2, MoreHorizontal } from 'lucide-react'
import { useMessageStore } from '../../stores/messages'
import { useChannelStore } from '../../stores/channels'
import { useGatewayStore } from '../../stores/gateway'

const MessageList = () => {
  const selectedChannelId = useChannelStore((state) => state.selectedChannelId)
  const messagesByChannel = useMessageStore((state) => state.messagesByChannel)
  const connect = useGatewayStore((state) => state.connect)
  
  useEffect(() => {
    connect() // Ensure Gateway is connected
  }, [connect])

  const messages = selectedChannelId ? (messagesByChannel[selectedChannelId] || []) : []

  return (
    <div className="flex flex-col px-4 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-dc-muted flex h-full items-center justify-center pt-20">
          No messages here yet. Be the first to say hello!
        </div>
      ) : (
        messages.map((msg) => (
          <Message 
            key={msg.id}
            author={msg.author?.username || `User ${msg.author_id}`} 
            time={new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
            content={msg.content} 
            isBot={msg.author_id === 0}
          />
        ))
      )}
    </div>
  )
}

interface MessageProps {
  author: string
  time: string
  content: string
  isBot?: boolean
  roleColor?: string
}

const Message = ({ author, time, content, isBot, roleColor }: MessageProps) => {
  return (
    <div className="group relative flex w-full items-start px-4 py-[2px] hover:bg-[#2e3035]">
      {/* Action Bar */}
      <div className="absolute -top-4 right-4 z-10 hidden rounded bg-dc-bg-secondary p-0.5 shadow-lg group-hover:flex">
        <IconButton icon={<Smile size={18} />} />
        <IconButton icon={<Reply size={18} />} />
        <IconButton icon={<Edit2 size={18} />} />
        <IconButton icon={<Trash2 size={18} />} />
        <IconButton icon={<MoreHorizontal size={18} />} />
      </div>

      <div className="mr-4 mt-1 flex-shrink-0">
        <img 
          src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${author}`} 
          className="h-10 w-10 rounded-full" 
          alt={author} 
        />
      </div>
      
      <div className="flex flex-col min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-bold hover:underline cursor-pointer" style={{ color: roleColor || 'var(--dc-text-normal)' }}>
            {author}
          </span>
          {isBot && (
            <span className="rounded bg-dc-blurple px-1 py-[2px] text-[10px] font-bold text-white uppercase">
              Bot
            </span>
          )}
          <span className="text-[12px] text-dc-muted">{time}</span>
        </div>
        <p className="whitespace-pre-wrap text-dc-normal leading-[1.375rem]">{content}</p>
      </div>
    </div>
  )
}

const IconButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal">
    {icon}
  </button>
)

export default MessageList
