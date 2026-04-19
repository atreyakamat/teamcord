import { useEffect, useMemo, useState } from 'react'
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
  const selectedWorkspaceId = useChannelStore((state) => state.selectedWorkspaceId)
  const setSelectedChannel = useChannelStore((state) => state.setSelectedChannel)
  const channels = useChannelStore((state) => state.channels)
  const channel = channels.find((currentChannel) => currentChannel.id === selectedChannelId)
  const [inputValue, setInputValue] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<
    { id: string; channelId: string; content: string; createdAt?: string }[]
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const channelsById = useMemo(
    () => new Map(channels.map((currentChannel) => [currentChannel.id, currentChannel])),
    [channels]
  )

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

  useEffect(() => {
    const query = searchValue.trim()
    if (query.length < 2 || !selectedWorkspaceId) {
      setSearchResults([])
      setSearchError('')
      return
    }

    let ignore = false
    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const params = new URLSearchParams({ q: query })
        const response = await apiFetch(`/api/v1/workspaces/${selectedWorkspaceId}/search?${params}`)
        if (!response.ok) {
          throw new Error('Search is not available for this workspace yet.')
        }

        const payload = (await response.json()) as {
          data?: { hits?: Array<Record<string, unknown>> }
        }
        if (ignore) {
          return
        }

        const hits = payload?.data?.hits || []
        setSearchResults(
          hits.map((hit) => ({
            id: String(hit.id ?? ''),
            channelId: String(hit.channel_id ?? ''),
            content: String(hit.content ?? ''),
            createdAt: hit.created_at ? String(hit.created_at) : undefined,
          }))
        )
      } catch (error) {
        if (!ignore) {
          console.error('Failed to search messages:', error)
          setSearchResults([])
          setSearchError('Search is unavailable right now.')
        }
      } finally {
        if (!ignore) {
          setSearchLoading(false)
        }
      }
    }, 320)

    return () => {
      ignore = true
      window.clearTimeout(timer)
    }
  }, [searchValue, selectedWorkspaceId])

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
              value={searchValue}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSearchResults(false), 120)
              }}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <Search size={14} className="absolute right-2 top-1.5" />

            {showSearchResults && searchValue.trim().length >= 2 && (
              <div className="absolute right-0 top-8 z-30 w-80 rounded border border-dc-border bg-dc-secondary p-2 shadow-2xl">
                {searchLoading && (
                  <div className="px-2 py-2 text-xs text-dc-muted">Searching...</div>
                )}

                {!searchLoading && searchError && (
                  <div className="px-2 py-2 text-xs text-[#f7b4b5]">{searchError}</div>
                )}

                {!searchLoading && !searchError && searchResults.length === 0 && (
                  <div className="px-2 py-2 text-xs text-dc-muted">No messages found.</div>
                )}

                {!searchLoading &&
                  !searchError &&
                  searchResults.map((result) => (
                    <button
                      key={`${result.channelId}-${result.id}`}
                      type="button"
                      className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left transition hover:bg-dc-hover"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        if (result.channelId) {
                          setSelectedChannel(result.channelId)
                        }
                        setShowSearchResults(false)
                      }}
                    >
                      <span className="truncate text-xs font-semibold text-dc-normal">
                        #{channelsById.get(result.channelId)?.name || 'channel'}
                      </span>
                      <span className="truncate text-xs text-dc-muted">{result.content || '(no text)'}</span>
                    </button>
                  ))}
              </div>
            )}
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
