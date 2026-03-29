const MemberList = () => {
  return (
    <div className="flex w-[240px] flex-col bg-dc-secondary">
      <div className="flex-grow overflow-y-auto px-2 py-3 space-y-4">
        {/* Category: Online */}
        <section>
          <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted">
            Online — 2
          </div>
          <div className="space-y-[2px]">
            <MemberRow name="atreyakamat" status="online" role="Admin" color="#ED4245" />
            <MemberRow name="Nexus Bot" status="online" isBot />
          </div>
        </section>

        {/* Category: Offline */}
        <section>
          <div className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-dc-muted">
            Offline — 5
          </div>
          <div className="space-y-[2px] opacity-40 grayscale">
            <MemberRow name="john_doe" status="offline" />
            <MemberRow name="jane_smith" status="offline" />
            <MemberRow name="dev_guru" status="offline" />
          </div>
        </section>
      </div>
    </div>
  )
}

interface MemberRowProps {
  name: string
  status: string
  isBot?: boolean
  role?: string
  color?: string
}

const MemberRow = ({ name, status, isBot, role, color }: MemberRowProps) => {
  return (
    <div className="group flex items-center rounded px-2 py-1 transition hover:bg-dc-hover cursor-pointer">
      <div className="relative mr-3">
        <img 
          src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`} 
          className="h-8 w-8 rounded-full" 
          alt={name} 
        />
        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dc-secondary 
          ${status === 'online' ? 'bg-dc-green' : 'bg-[#747f8d]'}`} 
        />
      </div>
      <div className="flex flex-col truncate leading-tight">
        <div className="flex items-center space-x-1 truncate">
          <span className="font-medium truncate" style={{ color: color || 'var(--dc-text-normal)' }}>{name}</span>
          {isBot && (
            <span className="rounded bg-dc-blurple px-1 py-[2px] text-[10px] font-bold text-white uppercase">
              Bot
            </span>
          )}
        </div>
        {role && <span className="text-[11px] text-dc-muted truncate">{role}</span>}
      </div>
    </div>
  )
}

export default MemberList
