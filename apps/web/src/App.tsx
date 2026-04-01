import { useState } from 'react'
import ServerRail from './components/layout/ServerRail'
import ChannelSidebar from './components/layout/ChannelSidebar'
import ChatArea from './components/layout/ChatArea'
import MemberList from './components/layout/MemberList'
import { VoiceChannel } from './components/voice/VoiceChannel'
import { useChannelStore } from './stores/channels'

function App() {
  const [showMemberList, setShowMemberList] = useState(true)
  const { selectedChannelId, channels, activeVoiceChannelId, setActiveVoiceChannel } = useChannelStore()

  const selectedChannel = channels.find(c => c.id === selectedChannelId)
  
  // If no real channels are loaded yet but mock-voice is selected
  const isVoiceSelected = selectedChannel?.type === 'voice' || selectedChannelId === 'mock-voice'

  return (
    <div className="flex h-full w-full select-none overflow-hidden bg-dc-tertiary">
      {/* Server Rail - 72px */}
      <ServerRail />

      <div className="flex flex-grow overflow-hidden rounded-tl-lg bg-dc-secondary">
        {/* Channel Sidebar - 240px */}
        <ChannelSidebar />

        {/* Main Content Area */}
        <main className="flex flex-grow overflow-hidden bg-dc-primary">
          {isVoiceSelected ? (
            <VoiceChannel 
              channelId={selectedChannelId || activeVoiceChannelId || 'mock'} 
              onLeave={() => setActiveVoiceChannel(null)} 
            />
          ) : (
            <>
              <ChatArea onToggleMemberList={() => setShowMemberList(!showMemberList)} />
              {/* Member List - 240px */}
              {showMemberList && <MemberList />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
