import { ChevronDown, Hash, Volume2, Settings, Mic, Headphones } from 'lucide-react'

const ChannelSidebar = () => {
  return (
    <div className="flex w-[240px] flex-col bg-dc-secondary">
      {/* Workspace Header */}
      <header className="flex h-12 items-center justify-between px-4 font-bold shadow-sm transition hover:bg-dc-hover cursor-pointer border-b border-dc-tertiary">
        <span className="truncate">Nexus HQ</span>
        <ChevronDown size={20} className="text-dc-normal" />
      </header>

      {/* Channels List */}
      <div className="flex-grow overflow-y-auto px-2 py-3 space-y-4">
        {/* Category: Information */}
        <section>
          <div className="flex items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white cursor-pointer">
            <ChevronDown size={12} className="mr-1" />
            <span>Information</span>
          </div>
          <div className="space-y-[2px]">
            <ChannelRow name="announcements" active />
            <ChannelRow name="rules" />
          </div>
        </section>

        {/* Category: Projects */}
        <section>
          <div className="flex items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white cursor-pointer">
            <ChevronDown size={12} className="mr-1" />
            <span>Projects</span>
          </div>
          <div className="space-y-[2px]">
            <ChannelRow name="nexus-v1" />
            <ChannelRow name="marketing" />
            <ChannelRow name="design-system" />
          </div>
        </section>

        {/* Category: Voice Channels */}
        <section>
          <div className="flex items-center px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted hover:text-white cursor-pointer">
            <ChevronDown size={12} className="mr-1" />
            <span>Voice Channels</span>
          </div>
          <div className="space-y-[2px]">
            <ChannelRow name="General" isVoice />
            <ChannelRow name="Gaming" isVoice />
          </div>
        </section>
      </div>

      {/* User Area */}
      <footer className="flex h-[52px] items-center bg-[#232428] px-2 py-1">
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
            <span className="text-sm font-bold text-white truncate">atreyakamat</span>
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

const ChannelRow = ({ name, active, isVoice }: { name: string; active?: boolean; isVoice?: boolean }) => {
  return (
    <div className={`
      group flex items-center rounded px-2 py-[6px] transition cursor-pointer
      ${active ? 'bg-dc-selected text-white' : 'text-dc-muted hover:bg-dc-hover hover:text-dc-normal'}
    `}>
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
