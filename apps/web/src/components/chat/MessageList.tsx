import { Smile, Reply, Edit2, Trash2, MoreHorizontal } from 'lucide-react'

const MessageList = () => {
  return (
    <div className="flex flex-col px-4 py-4 space-y-4">
      <Message 
        author="atreyakamat" 
        time="Today at 10:30 AM" 
        content="Welcome to the Nexus announcements channel! 🚀" 
        roleColor="#ED4245"
      />
      <Message 
        author="Nexus Bot" 
        time="Today at 10:31 AM" 
        content="The initial deployment of the messaging service is complete. WebSocket gateway is now online and accepting connections." 
        isBot
      />
      <Message 
        author="atreyakamat" 
        time="Today at 10:35 AM" 
        content="Great work! Let's start building the voice and video services next. We'll be using mediasoup for the SFU." 
        roleColor="#ED4245"
      />
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
        
        {/* Reactions placeholder */}
        <div className="mt-1 flex flex-wrap gap-1">
          <ReactionPill emoji="🚀" count={1} active />
          <ReactionPill emoji="🔥" count={2} />
        </div>
      </div>
    </div>
  )
}

const ReactionPill = ({ emoji, count, active }: { emoji: string, count: number, active?: boolean }) => (
  <div className={`
    flex h-6 items-center space-x-1 rounded px-2 text-xs font-medium cursor-pointer transition
    ${active ? 'bg-[rgba(88,101,242,0.15)] border border-dc-blurple' : 'bg-[#2b2d31] hover:bg-[#37393f] border border-transparent'}
  `}>
    <span>{emoji}</span>
    <span className={active ? 'text-dc-blurple' : 'text-dc-muted'}>{count}</span>
  </div>
)

const IconButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal">
    {icon}
  </button>
)

export default MessageList
