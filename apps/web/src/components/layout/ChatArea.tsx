import { useState } from 'react'
import { Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, Gift, Sticker, Smile } from 'lucide-react'
import MessageList from '../chat/MessageList'
import { useChannelStore } from '../../stores/channels'
import { useGatewayStore } from '../../stores/gateway'
import { buildApiUrl } from '../../lib/config'

interface ChatAreaProps {
  onToggleMemberList: () => void
}

const ChatArea = ({ onToggleMemberList }: ChatAreaProps) => {
  const selectedChannelId = useChannelStore((state) => state.selectedChannelId)
  const channels = useChannelStore((state) => state.channels)
  const channel = channels.find(c => c.id === selectedChannelId)
  
  const sendMessage = useGatewayStore((state) => state.sendMessage)
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && selectedChannelId) {
      try {
        await fetch(buildApiUrl(`/api/v1/channels/${selectedChannelId}/messages`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: inputValue,
            type: 'default',
          })
        });
        setInputValue('');
      } catch (err) {
        console.error('Failed to send message', err);
      }
    }
  }

  return (
    <div className="flex flex-grow flex-col overflow-hidden bg-dc-primary">
      {/* Header Bar */}
      <header className="flex h-12 min-h-[48px] items-center justify-between border-b border-dc-tertiary px-4 shadow-sm">
        <div className="flex items-center space-x-2 truncate">
          <Hash className="text-dc-muted" size={24} />
          <span className="font-bold text-white">{channel?.name || 'unknown'}</span>
          <div className="mx-2 h-6 w-[1px] bg-dc-border" />
          <span className="truncate text-sm text-dc-muted">Channel description</span>
        </div>
        
        <div className="flex items-center space-x-4 text-dc-muted">
          <Bell size={24} className="hover:text-dc-normal cursor-pointer" />
          <Pin size={24} className="hover:text-dc-normal cursor-pointer" />
          <Users size={24} className="hover:text-dc-normal cursor-pointer" onClick={onToggleMemberList} />
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search" 
              className="h-6 w-36 rounded bg-dc-tertiary px-2 text-xs focus:outline-none"
            />
            <Search size={14} className="absolute right-2 top-1.5" />
          </div>
          
          <Inbox size={24} className="hover:text-dc-normal cursor-pointer" />
          <HelpCircle size={24} className="hover:text-dc-normal cursor-pointer" />
        </div>
      </header>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto">
        <MessageList />
      </div>

      {/* Input Bar */}
      <div className="px-4 pb-6">
        <div className="flex items-center space-x-4 rounded-lg bg-dc-input px-4 py-2.5">
          <button className="text-dc-muted hover:text-dc-normal">
            <PlusCircle size={24} />
          </button>
          <input 
            type="text" 
            placeholder={`Message #${channel?.name || 'channel'}`}
            className="flex-grow bg-transparent text-dc-normal focus:outline-none placeholder:text-dc-muted"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center space-x-3 text-dc-muted">
            <Gift size={24} className="hover:text-dc-normal cursor-pointer" />
            <Sticker size={24} className="hover:text-dc-normal cursor-pointer" />
            <Smile size={24} className="hover:text-dc-normal cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatArea
