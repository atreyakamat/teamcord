import { ChevronDown, Hash, Volume2, Settings, Mic, Headphones } from 'lucide-react'
import { useChannelStore } from '../../stores/channels'
import { useEffect } from 'react'

const ChannelSidebar = () => {
  const { 
    categories, 
    channels, 
    selectedChannelId, 
    setSelectedChannel,
    activeVoiceChannelId,
    setActiveVoiceChannel
  } = useChannelStore()

  // For testing, fetch from workspace "1"
  const fetchChannels = useChannelStore(state => state.fetchChannels)
  useEffect(() => {
    fetchChannels("1")
  }, [fetchChannels])

  const handleChannelClick = (id: string, isVoice: boolean) => {
    if (isVoice) {
      setActiveVoiceChannel(id)
    }
    setSelectedChannel(id)
  }

  // Get uncategorized channels
  const uncategorized = channels.filter(c => !c.parentId)

  return (
    <div className="flex w-[240px] flex-col bg-dc-secondary">
      {/* Workspace Header */}
      <header className="flex h-12 min-h-[48px] items-center justify-between px-4 font-bold shadow-sm transition hover:bg-dc-hover cursor-pointer border-b border-dc-tertiary">
        <span className="truncate text-white">Nexus HQ</span>
        <ChevronDown size={20} className="text-dc-normal" />
      </header>

      {/* Channels List */}
      <div className="flex-grow overflow-y-auto px-2 py-3 space-y-4">
        {/* Uncategorized Channels */}
        {uncategorized.length > 0 && (
          <div className="space-y-[2px]">
            {uncategorized.map(channel => (
              <ChannelRow 
                key={channel.id}
                name={channel.name} 
                active={selectedChannelId === channel.id} 
                isVoice={channel.type === 'voice'}
                onClick={() => handleChannelClick(channel.id, channel.type === 'voice')}
              />
            ))}
          </div>
        )}

        {/* Categories */}
        {categories.map(category => (
          <section key={category.id}>
            <div className="flex items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white cursor-pointer">
              <ChevronDown size={12} className="mr-1" />
              <span>{category.name}</span>
            </div>
            <div className="space-y-[2px]">
              {category.channels.map(channel => (
                <ChannelRow 
                  key={channel.id}
                  name={channel.name} 
                  active={selectedChannelId === channel.id} 
                  isVoice={channel.type === 'voice'}
                  onClick={() => handleChannelClick(channel.id, channel.type === 'voice')}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Fallback mock channels if empty */}
        {categories.length === 0 && uncategorized.length === 0 && (
          <section>
            <div className="flex items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white cursor-pointer">
              <ChevronDown size={12} className="mr-1" />
              <span>Mock Channels</span>
            </div>
            <div className="space-y-[2px]">
              <ChannelRow 
                name="general" 
                active={selectedChannelId === 'mock-text'} 
                onClick={() => setSelectedChannel('mock-text')} 
              />
              <ChannelRow 
                name="Gaming" 
                isVoice 
                active={selectedChannelId === 'mock-voice'} 
                onClick={() => handleChannelClick('mock-voice', true)} 
              />
            </div>
          </section>
        )}
      </div>

      {/* Voice Status (if connected) */}
      {activeVoiceChannelId && (
        <div className="flex flex-col bg-dc-tertiary px-2 py-2 border-b border-dc-border">
          <div className="flex items-center justify-between text-dc-green font-semibold text-sm px-1">
            <span className="flex items-center"><Volume2 size={16} className="mr-1"/> Voice Connected</span>
          </div>
          <div className="text-xs text-dc-muted px-1 truncate">
            Nexus Server
          </div>
        </div>
      )}

      {/* User Area */}
      <footer className="flex h-[52px] min-h-[52px] items-center bg-[#232428] px-2 py-1">
        <div className="flex flex-grow items-center space-x-2 rounded px-1 py-1 transition hover:bg-dc-hover cursor-pointer">
          <div className="relative">
            <img 
              src="https://api.dicebear.com/8.x/avataaars/svg?seed=nexus" 
              className="h-8 w-8 rounded-full" 
              alt="User Avatar" 
            />
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#232428] bg-dc-green" />
          </div>
          <div className="flex flex-col truncate leading-tight">
            <span className="text-sm font-bold text-white truncate">User</span>
            <span className="text-xs text-dc-muted truncate">#0001</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <IconButton icon={<Mic size={18} />} />
          <IconButton icon={<Headphones size={18} />} />
          <IconButton icon={<Settings size={18} />} />
        </div>
      </footer>
    </div>
  )
}

const ChannelRow = ({ name, active, isVoice, onClick }: { name: string; active?: boolean; isVoice?: boolean; onClick?: () => void }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        group flex items-center rounded px-2 py-[6px] transition cursor-pointer
        ${active ? 'bg-dc-selected text-white' : 'text-dc-muted hover:bg-dc-hover hover:text-dc-normal'}
      `}
    >
      {isVoice ? <Volume2 size={20} className="mr-2 opacity-70" /> : <Hash size={20} className="mr-2 opacity-70" />}
      <span className="font-medium">{name}</span>
    </div>
  )
}

const IconButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal">
    {icon}
  </button>
)

export default ChannelSidebar
