import { useState, useRef, useEffect } from 'react';
import { Smile, Reply, Edit2, Trash2, MoreHorizontal, Pin, Copy, Link, Flag } from 'lucide-react';
import { useMessageStore, type Message as MessageType } from '../../stores/messages';
import { useAuthStore } from '../../stores/auth';
import EmojiPicker from './EmojiPicker';
import ReactionList from './ReactionList';
import { buildApiUrl } from '../../lib/config';

interface MessageProps {
  message: MessageType;
  isGrouped?: boolean;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
}

export default function Message({ message, isGrouped = false, onReply, onEdit }: MessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useAuthStore((state) => state.user);
  const isOwnMessage = currentUser?.id === message.authorId;
  
  const author = message.author;
  const timestamp = new Date(message.createdAt);
  const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = timestamp.toLocaleDateString([], { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = async (emoji: string) => {
    try {
      await fetch(
        buildApiUrl(`/api/v1/messages/${message.channelId}/${message.id}/reactions/${encodeURIComponent(emoji)}`),
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } }
      );
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    
    try {
      await fetch(
        buildApiUrl(`/api/v1/channels/${message.channelId}/messages/${message.id}`),
        { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent })
        }
      );
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await fetch(
        buildApiUrl(`/api/v1/channels/${message.channelId}/messages/${message.id}`),
        { method: 'DELETE' }
      );
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div 
      className={`group relative flex w-full items-start hover:bg-[#2e3035] ${isGrouped ? 'py-[2px] pl-[72px]' : 'mt-4 py-[2px] px-4'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !showEmojiPicker && !showMoreMenu && setShowActions(false)}
    >
      {/* Action Bar */}
      {showActions && !isEditing && (
        <div className="absolute -top-4 right-4 z-20 flex rounded border border-dc-border bg-dc-secondary p-0.5 shadow-lg">
          <div className="relative" ref={emojiPickerRef}>
            <ActionButton 
              icon={<Smile size={18} />} 
              tooltip="Add Reaction"
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
                onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/channels/${message.channelId}/${message.id}`)}
                onDelete={handleDelete}
                onReport={() => {}}
              />
            )}
          </div>
        </div>
      )}

      {/* Avatar (only for non-grouped messages) */}
      {!isGrouped && (
        <div className="mr-4 mt-0.5 flex-shrink-0">
          <img 
            src={author?.avatarUrl || `https://api.dicebear.com/8.x/avataaars/svg?seed=${author?.username || message.authorId}`} 
            className="h-10 w-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity" 
            alt={author?.username || 'User'} 
          />
        </div>
      )}

      {/* Hover timestamp for grouped messages */}
      {isGrouped && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-dc-muted opacity-0 group-hover:opacity-100 transition-opacity">
          {formattedTime}
        </span>
      )}
      
      <div className="flex flex-col min-w-0 flex-grow">
        {/* Header (only for non-grouped messages) */}
        {!isGrouped && (
          <div className="flex items-center space-x-2">
            <span 
              className="font-medium hover:underline cursor-pointer" 
              style={{ color: author?.roleColor || 'var(--dc-text-normal)' }}
            >
              {author?.displayName || author?.username || `User ${message.authorId}`}
            </span>
            {author?.isBot && (
              <span className="rounded bg-dc-blurple px-1 py-[2px] text-[10px] font-bold text-white uppercase">
                Bot
              </span>
            )}
            <span className="text-[12px] text-dc-muted" title={formattedDate}>{formattedTime}</span>
            {message.edited && (
              <span className="text-[10px] text-dc-muted">(edited)</span>
            )}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded bg-dc-input px-3 py-2 text-dc-normal focus:outline-none resize-none"
              rows={Math.min(editContent.split('\n').length + 1, 10)}
              autoFocus
            />
            <div className="flex items-center gap-2 text-xs text-dc-muted">
              <span>escape to <button onClick={() => setIsEditing(false)} className="text-dc-link hover:underline">cancel</button></span>
              <span>•</span>
              <span>enter to <button onClick={handleEdit} className="text-dc-link hover:underline">save</button></span>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-dc-normal leading-[1.375rem] break-words">
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment: any, idx: number) => (
              <AttachmentPreview key={idx} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Reactions */}
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
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}

const ActionButton = ({ icon, tooltip, onClick }: ActionButtonProps) => (
  <button 
    className="flex h-8 w-8 items-center justify-center rounded text-dc-muted transition hover:bg-dc-hover hover:text-dc-normal group/btn relative"
    onClick={onClick}
    title={tooltip}
  >
    {icon}
  </button>
);

interface MoreMenuProps {
  isOwnMessage: boolean;
  onPin: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onReport: () => void;
}

const MoreMenu = ({ isOwnMessage, onPin, onCopy, onCopyLink, onDelete, onReport }: MoreMenuProps) => (
  <div className="absolute right-0 top-full mt-1 w-48 rounded bg-[#111214] py-1.5 shadow-lg z-50">
    <MenuItem icon={<Pin size={16} />} label="Pin Message" onClick={onPin} />
    <MenuItem icon={<Copy size={16} />} label="Copy Text" onClick={onCopy} />
    <MenuItem icon={<Link size={16} />} label="Copy Message Link" onClick={onCopyLink} />
    <div className="my-1 h-px bg-dc-border" />
    {isOwnMessage ? (
      <MenuItem icon={<Trash2 size={16} />} label="Delete Message" danger onClick={onDelete} />
    ) : (
      <MenuItem icon={<Flag size={16} />} label="Report Message" danger onClick={onReport} />
    )}
  </div>
);

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}

const MenuItem = ({ icon, label, danger, onClick }: MenuItemProps) => (
  <button 
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
);

interface AttachmentPreviewProps {
  attachment: {
    url: string;
    filename: string;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

const AttachmentPreview = ({ attachment }: AttachmentPreviewProps) => {
  const isImage = attachment.mimeType?.startsWith('image/');
  const isVideo = attachment.mimeType?.startsWith('video/');

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img 
          src={attachment.url} 
          alt={attachment.filename}
          className="max-w-md max-h-[300px] rounded object-contain cursor-pointer hover:opacity-90"
          style={{ width: attachment.width, height: attachment.height }}
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video 
        src={attachment.url}
        controls
        className="max-w-md max-h-[300px] rounded"
      />
    );
  }

  return (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded bg-dc-secondary px-3 py-2 hover:bg-dc-hover transition"
    >
      <span className="text-dc-link hover:underline">{attachment.filename}</span>
    </a>
  );
};
