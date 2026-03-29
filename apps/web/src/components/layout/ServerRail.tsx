import React from 'react'
import { Plus, Compass, Download } from 'lucide-react'

const ServerRail = () => {
  return (
    <nav className="flex w-[72px] flex-col items-center space-y-2 py-3 bg-dc-tertiary">
      {/* Nexus Logo (Direct Messages) */}
      <ServerIcon active icon={<img src="/nexus-logo.svg" className="w-7 h-7" alt="Nexus" />} />
      
      <div className="mx-auto h-[2px] w-8 rounded-full bg-dc-border" />
      
      {/* Sample Servers */}
      <ServerIcon name="Team Nexus" active />
      <ServerIcon name="Project Alpha" />
      <ServerIcon name="Agency" unread />
      
      <ServerIcon icon={<Plus className="text-dc-green" size={24} />} isControl />
      <ServerIcon icon={<Compass className="text-dc-green" size={24} />} isControl />
      
      <div className="mt-auto">
        <ServerIcon icon={<Download className="text-dc-green" size={24} />} isControl />
      </div>
    </nav>
  )
}

interface ServerIconProps {
  name?: string
  icon?: React.ReactNode
  active?: boolean
  unread?: boolean
  isControl?: boolean
}

const ServerIcon = ({ name, icon, active, unread, isControl }: ServerIconProps) => {
  return (
    <div className="group relative flex items-center">
      {/* Indicator Pill */}
      {unread && !active && (
        <div className="absolute left-0 h-2 w-1 rounded-r-full bg-white transition-all duration-200" />
      )}
      {active && (
        <div className="absolute left-0 h-10 w-1 rounded-r-full bg-white transition-all duration-200" />
      )}
      {!active && !unread && (
        <div className="absolute left-0 h-0 w-1 rounded-r-full bg-white transition-all duration-200 group-hover:h-5" />
      )}

      <button
        className={`
          flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200
          ${active ? 'rounded-[16px] bg-dc-blurple text-white' : 
            isControl ? 'rounded-[24px] bg-dc-bg-secondary text-dc-green hover:rounded-[16px] hover:bg-dc-green hover:text-white' :
            'rounded-[24px] bg-dc-bg-secondary text-dc-normal hover:rounded-[16px] hover:bg-dc-blurple hover:text-white'}
        `}
      >
        {icon ? icon : (
          <span className="text-lg font-medium">
            {name?.split(' ').map(n => n[0]).join('')}
          </span>
        )}
      </button>

      {/* Tooltip (Simplified) */}
      <div className="absolute left-16 z-50 hidden rounded bg-black px-3 py-2 text-sm font-bold shadow-lg group-hover:block">
        {name || 'Add a Server'}
      </div>
    </div>
  )
}

export default ServerRail
