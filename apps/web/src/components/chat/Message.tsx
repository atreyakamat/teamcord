import { useEffect, useRef, useState } from 'react'
import {
  Copy,
  Edit2,
  Flag,
  Link,
  MoreHorizontal,
  Pin,
  Reply,
  Smile,
  Trash2,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { type Message as MessageType } from '../../stores/messages'
import EmojiPicker from './EmojiPicker'
import ReactionList from './ReactionList'

interface MessageProps {
  message: MessageType
  isGrouped?: boolean
  onReply?: (message: MessageType) => void
  onEdit?: (message: MessageType) => void
}

export default function Message({
  message,
  isGrouped = false,
  onReply,
  onEdit,
}: MessageProps) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  const currentUser = useAuthStore((state) => state.user)
  const isOwnMessage = currentUser?.id === message.authorId

  const author = message.author
  const timestamp = new Date(message.createdAt)
  const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const formattedDate = timestamp.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleReaction = async (emoji: string) => {
    try {
      await apiFetch(
        `/api/v1/channels/${message.channelId}/messages/${message.id}/reactions/${encodeURIComponent(emoji)}`,
        { method: 'PUT' }
      )
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false)
      setEditContent(message.content)
      return
    }

    try {
      await apiFetch(`/api/v1/channels/${message.channelId}/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editContent }),
      })
      setIsEditing(false)
      onEdit?.({ ...message, content: editContent })
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      await apiFetch(`/api/v1/channels/${message.channelId}/messages/${message.id}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleEdit()
    }

    if (event.key === 'Escape') {
      setIsEditing(false)
      setEditContent(message.content)
    }
  }

  return (
    <div
      className={`group relative flex w-full items-start hover:bg-[#2e3035] ${isGrouped ? 'py-[2px] pl-[72px]' : 'mt-4 px-4 py-[2px]'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !showEmojiPicker && !showMoreMenu && setShowActions(false)}
    >
      {showActions && !isEditing && (
        <div className="absolute -top-4 right-4 z-20 flex rounded border border-dc-border bg-dc-secondary p-0.5 shadow-lg">
          <div className="relative" ref={emojiPickerRef}>
            <ActionButton
              icon={<Smile size={18} />}
              tooltip="Add reaction"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            />
            {showEmojiPicker && (
              <EmojiPicker onSelect={handleReaction} onClose={() => setShowEmojiPicker(false)} />
            )}
          </div>
          <ActionButton icon={<Reply size={18} />} tooltip="Reply" onClick={() => onReply?.(message)} />
          {isOwnMessage && (
            <ActionButton icon={<Edit2 size={18} />} tooltip="Edit" onClick={() => setIsEditing(true)} />
          )}
          <div className="relative" ref={moreMenuRef}>
            <ActionButton
              icon={<MoreHorizontal size={18} />}
              tooltip="More"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            />
            {showMoreMenu && (
              <MoreMenu
                isOwnMessage={isOwnMessage}
                onPin={() => {}}
                onCopy={() => navigator.clipboard.writeText(message.content)}
                onCopyLink={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/channels/${message.channelId}/${message.id}`
                  )
                }
                onDelete={handleDelete}
                onReport={() => {}}
              />
            )}
          </div>
        </div>
      )}

      {!isGrouped && (
        <div className="mr-4 mt-0.5 flex-shrink-0">
          <img
            src={
              author?.avatarUrl ||
              `https://api.dicebear.com/8.x/avataaars/svg?seed=${author?.username || message.authorId}`
            }
            className="h-10 w-10 cursor-pointer rounded-full transition-opacity hover:opacity-80"
            alt={author?.username || 'User'}
          />
        </div>
      )}

      {isGrouped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-dc-muted opacity-0 transition-opacity group-hover:opacity-100">
          {formattedTime}
        </span>
      )}

      <div className="flex min-w-0 flex-grow flex-col">
        {!isGrouped && (
          <div className="flex items-center space-x-2">
            <span
              className="cursor-pointer font-medium hover:underline"
              style={{ color: author?.roleColor || 'var(--dc-text-normal)' }}
            >
              {author?.displayName || author?.username || `User ${message.authorId}`}
            </span>
            {author?.isBot && (
              <span className="rounded bg-dc-blurple px-1 py-[2px] text-[10px] font-bold uppercase text-white">
                Bot
              </span>
            )}
            <span className="text-[12px] text-dc-muted" title={formattedDate}>
              {formattedTime}
            </span>
            {message.edited && <span className="text-[10px] text-dc-muted">(edited)</span>}
          </div>
        )}

        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none rounded bg-dc-input px-3 py-2 text-dc-normal focus:outline-none"
              rows={Math.min(editContent.split('\n').length + 1, 10)}
              autoFocus
            />
            <div className="flex items-center gap-2 text-xs text-dc-muted">
              <span>
                escape to{' '}
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-dc-link hover:underline"
                >
                  cancel
                </button>
              </span>
              <span>|</span>
              <span>
                enter to{' '}
                <button type="button" onClick={handleEdit} className="text-dc-link hover:underline">
                  save
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words leading-[1.375rem] text-dc-normal">
            {message.content}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <AttachmentPreview key={`${attachment.url}-${index}`} attachment={attachment} />
            ))}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <ReactionList
            reactions={message.reactions}
            messageId={message.id}
            channelId={message.channelId}
            onAddReaction={() => setShowEmojiPicker(true)}
          />
        )}
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
}

const ActionButton = ({ icon, tooltip, onClick }: ActionButtonProps) => (
  <button
    type="button"
    className="group/btn relative flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal"
    onClick={onClick}
    title={tooltip}
  >
    {icon}
  </button>
)

interface MoreMenuProps {
  isOwnMessage: boolean
  onPin: () => void
  onCopy: () => void
  onCopyLink: () => void
  onDelete: () => void
  onReport: () => void
}

const MoreMenu = ({ isOwnMessage, onPin, onCopy, onCopyLink, onDelete, onReport }: MoreMenuProps) => (
  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded bg-[#111214] py-1.5 shadow-lg">
    <MenuItem icon={<Pin size={16} />} label="Pin message" onClick={onPin} />
    <MenuItem icon={<Copy size={16} />} label="Copy text" onClick={onCopy} />
    <MenuItem icon={<Link size={16} />} label="Copy message link" onClick={onCopyLink} />
    <div className="my-1 h-px bg-dc-border" />
    {isOwnMessage ? (
      <MenuItem icon={<Trash2 size={16} />} label="Delete message" danger onClick={onDelete} />
    ) : (
      <MenuItem icon={<Flag size={16} />} label="Report message" danger onClick={onReport} />
    )}
  </div>
)

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick?: () => void
}

const MenuItem = ({ icon, label, danger, onClick }: MenuItemProps) => (
  <button
    type="button"
    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition ${
      danger
        ? 'text-dc-red hover:bg-dc-red hover:text-white'
        : 'text-dc-normal hover:bg-dc-blurple hover:text-white'
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
)

interface AttachmentPreviewProps {
  attachment: {
    url: string
    filename: string
    mimeType: string
    width?: number
    height?: number
  }
}

const AttachmentPreview = ({ attachment }: AttachmentPreviewProps) => {
  const isImage = attachment.mimeType?.startsWith('image/')
  const isVideo = attachment.mimeType?.startsWith('video/')

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="max-h-[300px] max-w-md cursor-pointer rounded object-contain hover:opacity-90"
          style={{ width: attachment.width, height: attachment.height }}
        />
      </a>
    )
  }

  if (isVideo) {
    return <video src={attachment.url} controls className="max-h-[300px] max-w-md rounded" />
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded bg-dc-secondary px-3 py-2 transition hover:bg-dc-hover"
    >
      <span className="text-dc-link hover:underline">{attachment.filename}</span>
    </a>
  )
}
