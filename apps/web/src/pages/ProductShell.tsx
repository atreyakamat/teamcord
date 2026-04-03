import { useEffect, useMemo, useState } from 'react'
import AuthScreen from '../components/auth/AuthScreen'
import ChannelSidebar from '../components/layout/ChannelSidebar'
import ChatArea from '../components/layout/ChatArea'
import MemberList from '../components/layout/MemberList'
import ServerRail from '../components/layout/ServerRail'
import { VoiceChannel } from '../components/voice/VoiceChannel'
import { useAuthStore } from '../stores/auth'
import { useChannelStore } from '../stores/channels'

const ProductShell = () => {
  const [showMemberList, setShowMemberList] = useState(true)
  const { isAuthenticated, token, user, workspaces, fetchCurrentUser, fetchWorkspaces, logout } =
    useAuthStore()
  const {
    selectedChannelId,
    channels,
    activeVoiceChannelId,
    selectedWorkspaceId,
    setActiveVoiceChannel,
    setSelectedChannel,
    setSelectedWorkspace,
    fetchChannels,
  } = useChannelStore()
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false)
      return
    }

    let cancelled = false
    setIsBootstrapping(true)

    Promise.all([
      user ? Promise.resolve() : fetchCurrentUser(),
      workspaces.length > 0 ? Promise.resolve() : fetchWorkspaces(),
    ])
      .catch((error) => {
        console.error('Failed to bootstrap TeamCord session:', error)
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, user, workspaces.length, fetchCurrentUser, fetchWorkspaces])

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].id)
    }
  }, [selectedWorkspaceId, setSelectedWorkspace, workspaces])

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchChannels(selectedWorkspaceId)
    }
  }, [selectedWorkspaceId, fetchChannels])

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId),
    [channels, selectedChannelId]
  )

  const handleLeaveVoice = () => {
    setActiveVoiceChannel(null)

    if (selectedChannel?.type === 'voice') {
      const fallbackChannel =
        channels.find((channel) => channel.type === 'text') ||
        channels.find((channel) => channel.type === 'dm') ||
        channels.find((channel) => channel.type !== 'voice')

      setSelectedChannel(fallbackChannel?.id ?? null)
    }
  }

  const renderMainContent = () => {
    if (selectedChannel?.type === 'voice' && selectedChannelId) {
      return <VoiceChannel channelId={selectedChannelId} onLeave={handleLeaveVoice} />
    }

    if (activeVoiceChannelId) {
      return <VoiceChannel channelId={activeVoiceChannelId} onLeave={handleLeaveVoice} />
    }

    return (
      <>
        <ChatArea onToggleMemberList={() => setShowMemberList((current) => !current)} />
        {showMemberList && <MemberList />}
      </>
    )
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#10292f] text-[#f6efe5]">
        <div className="text-center">
          <div className="font-display text-4xl">TeamCord</div>
          <div className="mt-3 text-sm uppercase tracking-[0.24em] text-[#9fc1bb]">
            Loading workspace
          </div>
        </div>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#10292f] px-6 text-[#f6efe5]">
        <div className="max-w-lg rounded-[2rem] border border-[rgba(246,239,229,0.14)] bg-[rgba(8,22,25,0.72)] p-8 text-center">
          <h1 className="font-display text-4xl">No workspace found</h1>
          <p className="mt-4 text-base leading-8 text-[#bfd3cf]">
            This account signed in successfully, but it does not have a TeamCord workspace yet.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-full bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#10292f] transition hover:bg-[#e96d10]"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full select-none overflow-hidden bg-dc-tertiary">
      <ServerRail />

      <div className="flex flex-grow overflow-hidden rounded-tl-lg bg-dc-secondary">
        <ChannelSidebar />

        <main className="flex flex-grow overflow-hidden bg-dc-primary">{renderMainContent()}</main>
      </div>
    </div>
  )
}

export default ProductShell
