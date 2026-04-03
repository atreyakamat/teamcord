import {
  ChevronDown,
  Hash,
  Headphones,
  LogOut,
  MessageSquareText,
  Mic,
  Settings,
  Volume2,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useChannelStore } from '../../stores/channels'

const ChannelSidebar = () => {
  const {
    categories,
    channels,
    selectedChannelId,
    selectedWorkspaceId,
    setSelectedChannel,
    activeVoiceChannelId,
    setActiveVoiceChannel,
  } = useChannelStore()
  const { user, workspaces, logout } = useAuthStore()

  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId)
  const directMessages = channels.filter((channel) => channel.type === 'dm')
  const uncategorized = channels.filter((channel) => !channel.parentId && channel.type !== 'dm')
  const activeVoiceChannel = channels.find((channel) => channel.id === activeVoiceChannelId)

  const handleChannelClick = (id: string, type: string) => {
    if (type === 'voice') {
      setActiveVoiceChannel(id)
    } else if (activeVoiceChannelId === id) {
      setActiveVoiceChannel(null)
    }
    setSelectedChannel(id)
  }

  return (
    <div className="flex w-[240px] flex-col bg-dc-secondary">
      <header className="flex h-12 min-h-[48px] cursor-pointer items-center justify-between border-b border-dc-tertiary px-4 font-bold shadow-sm transition hover:bg-dc-hover">
        <span className="truncate text-white">{workspace?.name || 'TeamCord Workspace'}</span>
        <ChevronDown size={20} className="text-dc-normal" />
      </header>

      <div className="flex-grow space-y-4 overflow-y-auto px-2 py-3">
        {uncategorized.length > 0 && (
          <div className="space-y-[2px]">
            {uncategorized.map((channel) => (
              <ChannelRow
                key={channel.id}
                name={channel.name}
                active={selectedChannelId === channel.id}
                type={channel.type}
                onClick={() => handleChannelClick(channel.id, channel.type)}
              />
            ))}
          </div>
        )}

        {categories.map((category) => (
          <section key={category.id}>
            <div className="flex cursor-pointer items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white">
              <ChevronDown size={12} className="mr-1" />
              <span>{category.name}</span>
            </div>
            <div className="space-y-[2px]">
              {category.channels.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  name={channel.name}
                  active={selectedChannelId === channel.id}
                  type={channel.type}
                  onClick={() => handleChannelClick(channel.id, channel.type)}
                />
              ))}
            </div>
          </section>
        ))}

        {directMessages.length > 0 && (
          <section>
            <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted">
              Direct Messages
            </div>
            <div className="space-y-[2px]">
              {directMessages.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  name={channel.name}
                  active={selectedChannelId === channel.id}
                  type={channel.type}
                  onClick={() => handleChannelClick(channel.id, channel.type)}
                />
              ))}
            </div>
          </section>
        )}

        {categories.length === 0 && uncategorized.length === 0 && (
          <div className="rounded-lg border border-dashed border-dc-border bg-[rgba(30,31,34,0.6)] px-3 py-4 text-sm text-dc-muted">
            No channels are available for this workspace yet.
          </div>
        )}
      </div>

      {activeVoiceChannelId && (
        <div className="flex flex-col border-b border-dc-border bg-dc-tertiary px-2 py-2">
          <div className="px-1 text-sm font-semibold text-dc-green">
            <span className="flex items-center">
              <Volume2 size={16} className="mr-1" /> Voice Connected
            </span>
          </div>
          <div className="truncate px-1 text-xs text-dc-muted">
            {activeVoiceChannel?.name || 'Live voice room'}
          </div>
        </div>
      )}

      <footer className="flex h-[52px] min-h-[52px] items-center bg-[#232428] px-2 py-1">
        <div className="flex flex-grow cursor-pointer items-center space-x-2 rounded px-1 py-1 transition hover:bg-dc-hover">
          <div className="relative">
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/8.x/avataaars/svg?seed=${user?.username || 'teamcord-user'}`
              }
              className="h-8 w-8 rounded-full"
              alt={user?.displayName || 'User avatar'}
            />
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#232428] bg-dc-green" />
          </div>
          <div className="flex flex-col truncate leading-tight">
            <span className="truncate text-sm font-bold text-white">
              {user?.displayName || 'TeamCord User'}
            </span>
            <span className="truncate text-xs text-dc-muted">@{user?.username || 'member'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <IconButton icon={<Mic size={18} />} title="Mute microphone" />
          <IconButton icon={<Headphones size={18} />} title="Deafen audio" />
          <IconButton icon={<Settings size={18} />} title="Workspace settings" />
          <IconButton icon={<LogOut size={18} />} title="Sign out" onClick={logout} />
        </div>
      </footer>
    </div>
  )
}

const ChannelRow = ({
  name,
  active,
  type,
  onClick,
}: {
  name: string
  active?: boolean
  type?: string
  onClick?: () => void
}) => {
  const getIcon = () => {
    switch (type) {
      case 'voice':
        return <Volume2 size={20} className="mr-2 opacity-70" />
      case 'dm':
        return <MessageSquareText size={18} className="mr-2 opacity-70" />
      default:
        return <Hash size={20} className="mr-2 opacity-70" />
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        group flex cursor-pointer items-center rounded px-2 py-[6px] transition
        ${active ? 'bg-dc-selected text-white' : 'text-dc-muted hover:bg-dc-hover hover:text-dc-normal'}
      `}
    >
      {getIcon()}
      <span className="font-medium">{name}</span>
    </div>
  )
}

const IconButton = ({
  icon,
  onClick,
  title,
}: {
  icon: React.ReactNode
  onClick?: () => void
  title?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal"
  >
    {icon}
  </button>
)

export default ChannelSidebar
