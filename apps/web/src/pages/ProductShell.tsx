import { useState } from 'react'
import ServerRail from '../components/layout/ServerRail'
import ChannelSidebar from '../components/layout/ChannelSidebar'
import ChatArea from '../components/layout/ChatArea'
import MemberList from '../components/layout/MemberList'
import { VoiceChannel } from '../components/voice/VoiceChannel'
import { useChannelStore } from '../stores/channels'

const ProductShell = () => {
  const [showMemberList, setShowMemberList] = useState(true)
  const { selectedChannelId, channels, activeVoiceChannelId, setActiveVoiceChannel } = useChannelStore()

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId)

  const renderMainContent = () => {
    if (selectedChannel?.type === 'voice' && selectedChannelId) {
      return <VoiceChannel channelId={selectedChannelId} onLeave={() => setActiveVoiceChannel(null)} />
    }

    if (activeVoiceChannelId) {
      return <VoiceChannel channelId={activeVoiceChannelId} onLeave={() => setActiveVoiceChannel(null)} />
    }

    return (
      <>
        <ChatArea onToggleMemberList={() => setShowMemberList((current) => !current)} />
        {showMemberList && <MemberList />}
      </>
    )
  }

  return (
    <div className="flex h-screen w-full select-none overflow-hidden bg-dc-tertiary">
      <ServerRail />

      <div className="flex flex-grow overflow-hidden rounded-tl-lg bg-dc-secondary">
        <ChannelSidebar />

        <main className="flex flex-grow overflow-hidden bg-dc-primary">
          {renderMainContent()}
        </main>
      </div>
    </div>
  )
}

export default ProductShell
