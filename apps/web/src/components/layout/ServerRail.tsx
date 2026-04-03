import React from 'react'
import { LogOut, MessageSquareText } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useChannelStore } from '../../stores/channels'

const ServerRail = () => {
  const workspaces = useAuthStore((state) => state.workspaces)
  const logout = useAuthStore((state) => state.logout)
  const { channels, selectedChannelId, selectedWorkspaceId, setSelectedChannel, setSelectedWorkspace } =
    useChannelStore()

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId)
  const firstDmChannel = channels.find((channel) => channel.type === 'dm')

  return (
    <nav className="flex w-[72px] flex-col items-center space-y-2 bg-dc-tertiary py-3">
      <ServerIcon
        active={selectedChannel?.type === 'dm'}
        onClick={() => {
          if (firstDmChannel) {
            setSelectedChannel(firstDmChannel.id)
          }
        }}
        icon={<span className="font-display text-lg font-bold">TC</span>}
        label="Direct messages"
      />

      <div className="mx-auto h-[2px] w-8 rounded-full bg-dc-border" />

      {workspaces.map((workspace) => (
        <ServerIcon
          key={workspace.id}
          name={workspace.name}
          active={selectedWorkspaceId === workspace.id}
          onClick={() => setSelectedWorkspace(workspace.id)}
          label={workspace.name}
        />
      ))}

      <div className="mt-auto">
        <ServerIcon
          icon={<MessageSquareText className="text-dc-green" size={22} />}
          isControl
          onClick={() => {
            if (selectedWorkspaceId) {
              setSelectedWorkspace(selectedWorkspaceId)
            }
          }}
          label="Workspace channels"
        />
        <div className="mt-2" />
        <ServerIcon
          icon={<LogOut className="text-dc-red" size={22} />}
          isControl
          onClick={logout}
          label="Sign out"
        />
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
  onClick?: () => void
  label?: string
}

const ServerIcon = ({ name, icon, active, unread, isControl, onClick, label }: ServerIconProps) => {
  return (
    <div className="group relative flex items-center">
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
        type="button"
        onClick={onClick}
        className={`
          flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200
          ${
            active
              ? 'rounded-[16px] bg-dc-blurple text-white'
              : isControl
                ? 'rounded-[24px] bg-dc-bg-secondary text-dc-green hover:rounded-[16px] hover:bg-dc-green hover:text-white'
                : 'rounded-[24px] bg-dc-bg-secondary text-dc-normal hover:rounded-[16px] hover:bg-dc-blurple hover:text-white'
          }
        `}
      >
        {icon ? (
          icon
        ) : (
          <span className="text-lg font-medium">
            {name?.split(' ').map((word) => word[0]).join('')}
          </span>
        )}
      </button>

      <div className="absolute left-16 z-50 hidden rounded bg-black px-3 py-2 text-sm font-bold shadow-lg group-hover:block">
        {label || name || 'Workspace'}
      </div>
    </div>
  )
}

export default ServerRail
