import { useState } from 'react'
import {
  Bell,
  Gift,
  Hash,
  HelpCircle,
  Inbox,
  Pin,
  PlusCircle,
  Search,
  Smile,
  Sticker,
  Users,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useChannelStore } from '../../stores/channels'
import MessageList from '../chat/MessageList'

interface ChatAreaProps {
  onToggleMemberList: () => void
}

const ChatArea = ({ onToggleMemberList }: ChatAreaProps) => {
  const selectedChannelId = useChannelStore((state) => state.selectedChannelId)
  const channels = useChannelStore((state) => state.channels)
  const channel = channels.find((currentChannel) => currentChannel.id === selectedChannelId)
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && inputValue.trim() && selectedChannelId) {
      try {
        await apiFetch(`/api/v1/channels/${selectedChannelId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: inputValue.trim(),
            type: 'text',
          }),
        })
        setInputValue('')
      } catch (error) {
        console.error('Failed to send message', error)
      }
    }
  }

  return (
    <div className="flex flex-grow flex-col overflow-hidden bg-dc-primary">
      <header className="flex h-12 min-h-[48px] items-center justify-between border-b border-dc-tertiary px-4 shadow-sm">
        <div className="flex items-center space-x-2 truncate">
          <Hash className="text-dc-muted" size={24} />
          <span className="font-bold text-white">{channel?.name || 'unknown'}</span>
          <div className="mx-2 h-6 w-[1px] bg-dc-border" />
          <span className="truncate text-sm text-dc-muted">
            {channel?.description || 'Jump in and start the conversation.'}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-dc-muted">
          <Bell size={24} className="cursor-pointer hover:text-dc-normal" />
          <Pin size={24} className="cursor-pointer hover:text-dc-normal" />
          <Users size={24} className="cursor-pointer hover:text-dc-normal" onClick={onToggleMemberList} />

          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="h-6 w-36 rounded bg-dc-tertiary px-2 text-xs focus:outline-none"
            />
            <Search size={14} className="absolute right-2 top-1.5" />
          </div>

          <Inbox size={24} className="cursor-pointer hover:text-dc-normal" />
          <HelpCircle size={24} className="cursor-pointer hover:text-dc-normal" />
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <MessageList />
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-center space-x-4 rounded-lg bg-dc-input px-4 py-2.5">
          <button type="button" className="text-dc-muted hover:text-dc-normal">
            <PlusCircle size={24} />
          </button>
          <input
            type="text"
            placeholder={`Message ${channel?.type === 'dm' ? '' : '#'}${channel?.name || 'channel'}`}
            className="flex-grow bg-transparent text-dc-normal placeholder:text-dc-muted focus:outline-none"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center space-x-3 text-dc-muted">
            <Gift size={24} className="cursor-pointer hover:text-dc-normal" />
            <Sticker size={24} className="cursor-pointer hover:text-dc-normal" />
            <Smile size={24} className="cursor-pointer hover:text-dc-normal" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatArea
