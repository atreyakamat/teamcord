import { useState } from 'react'
import ServerRail from './components/layout/ServerRail'
import ChannelSidebar from './components/layout/ChannelSidebar'
import ChatArea from './components/layout/ChatArea'
import MemberList from './components/layout/MemberList'
import { VoiceChannel } from './components/voice/VoiceChannel'
import { Whiteboard } from './components/pm/Whiteboard'
import { Kanban } from './components/pm/Kanban'
import { useChannelStore } from './stores/channels'

function App() {
  const [showMemberList, setShowMemberList] = useState(true)
  const { selectedChannelId, channels, activeVoiceChannelId, setActiveVoiceChannel } = useChannelStore()

  const selectedChannel = channels.find(c => c.id === selectedChannelId)
  
  // Logic to determine what component to render in the main view
  const renderMainContent = () => {
    // 1. Voice Channel
    if (selectedChannel?.type === 'voice' || selectedChannelId === 'mock-voice') {
      return (
        <VoiceChannel 
          channelId={selectedChannelId || activeVoiceChannelId || 'mock'} 
          onLeave={() => setActiveVoiceChannel(null)} 
        />
      )
    }

    // 2. Whiteboard
    if (selectedChannel?.type === 'whiteboard' || selectedChannelId === 'mock-whiteboard') {
      return <Whiteboard channelId={selectedChannelId || 'mock'} />
    }

    // 3. Kanban Board
    if (selectedChannel?.type === 'kanban' || selectedChannelId === 'mock-kanban') {
      return <Kanban channelId={selectedChannelId || 'mock'} />
    }

    // 4. Default: Text Chat
    return (
      <>
        <ChatArea onToggleMemberList={() => setShowMemberList(!showMemberList)} />
        {showMemberList && <MemberList />}
      </>
    )
  }

  return (
    <div className="flex h-full w-full select-none overflow-hidden bg-dc-tertiary">
      {/* Server Rail - 72px */}
      <ServerRail />

      <div className="flex flex-grow overflow-hidden rounded-tl-lg bg-dc-secondary">
        {/* Channel Sidebar - 240px */}
        <ChannelSidebar />

        {/* Main Content Area */}
        <main className="flex flex-grow overflow-hidden bg-dc-primary">
          {renderMainContent()}
        </main>
      </div>
    </div>
  )
}

export default App
