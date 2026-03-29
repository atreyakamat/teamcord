#!/usr/bin/env node
/**
 * Nexus Frontend Chat Components - Part 9
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n');
  console.log('✓ ' + filePath);
}

console.log('🚀 Nexus Chat Components\n');

writeFile('apps/web/src/components/chat/ChannelHeader.tsx', `import { Hash, Volume2, Users, Pin, Bell, Search, Inbox } from 'lucide-react';
import type { Channel } from '@nexus/shared';

interface ChannelHeaderProps {
  channel: Channel;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-background-tertiary shadow-sm">
      <div className="flex items-center gap-2">
        {channel.type === 'voice' ? (
          <Volume2 size={20} className="text-channel-default" />
        ) : (
          <Hash size={20} className="text-channel-default" />
        )}
        <span className="font-semibold">{channel.name}</span>
        {channel.topic && (
          <>
            <div className="w-px h-6 bg-interactive-muted mx-2" />
            <span className="text-sm text-text-muted truncate max-w-md">
              {channel.topic}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-interactive-normal hover:text-interactive-hover">
          <Bell size={20} />
        </button>
        <button className="text-interactive-normal hover:text-interactive-hover">
          <Pin size={20} />
        </button>
        <button className="text-interactive-normal hover:text-interactive-hover">
          <Users size={20} />
        </button>
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-36 h-6 px-2 text-sm bg-background-tertiary rounded border-none focus:outline-none focus:w-48 transition-all"
          />
          <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>
        <button className="text-interactive-normal hover:text-interactive-hover">
          <Inbox size={20} />
        </button>
      </div>
    </div>
  );
}`);

writeFile('apps/web/src/components/chat/ChatArea.tsx', `import { useRef, useEffect } from 'react';
import { useMessageStore } from '../../stores/messageStore';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

interface ChatAreaProps {
  channelId: string;
}

export function ChatArea({ channelId }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, typingUsers, isLoading, loadMoreMessages } = useMessageStore();
  const channelMessages = messages[channelId] || [];
  const typing = typingUsers[channelId] || [];

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelMessages.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && channelMessages.length > 0) {
      loadMoreMessages(channelId);
    }
  };

  if (isLoading && channelMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = groupMessagesByDate(channelMessages);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4"
      onScroll={handleScroll}
    >
      {channelMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-muted">
          <p className="text-xl font-semibold mb-2">Welcome to the channel!</p>
          <p>This is the start of the conversation.</p>
        </div>
      ) : (
        <>
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-interactive-muted" />
                <span className="text-xs text-text-muted font-semibold">{group.date}</span>
                <div className="flex-1 h-px bg-interactive-muted" />
              </div>
              {group.messages.map((message, idx) => (
                <MessageItem 
                  key={message.id} 
                  message={message}
                  showAvatar={idx === 0 || shouldShowAvatar(group.messages, idx)}
                  channelId={channelId}
                />
              ))}
            </div>
          ))}
        </>
      )}
      
      {typing.length > 0 && <TypingIndicator users={typing} />}
    </div>
  );
}

function groupMessagesByDate(messages: any[]) {
  const groups: { date: string; messages: any[] }[] = [];
  let currentDate = '';
  let currentGroup: any[] = [];

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (messageDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
}

function shouldShowAvatar(messages: any[], idx: number): boolean {
  if (idx === 0) return true;
  const current = messages[idx];
  const previous = messages[idx - 1];
  
  // Show avatar if different author or more than 5 minutes apart
  if (current.authorId !== previous.authorId) return true;
  
  const timeDiff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return timeDiff > 5 * 60 * 1000;
}`);

writeFile('apps/web/src/components/chat/MessageItem.tsx', `import { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Reply, Smile, Pencil, Trash2 } from 'lucide-react';
import type { Message } from '@nexus/shared';
import { useAuthStore } from '../../stores/authStore';
import { editMessage, deleteMessage, addReaction } from '../../services/socket';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';

interface MessageItemProps {
  message: Message;
  showAvatar: boolean;
  channelId: string;
}

export function MessageItem({ message, showAvatar, channelId }: MessageItemProps) {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isAuthor = user?.id === message.authorId;
  const timestamp = format(new Date(message.createdAt), 'h:mm a');
  const fullTimestamp = format(new Date(message.createdAt), 'MMMM d, yyyy h:mm a');

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage(message.id);
    }
  };

  const handleReaction = (emoji: string) => {
    addReaction(message.id, emoji);
  };

  return (
    <div
      className={clsx(
        'group relative flex gap-4 py-0.5 px-2 -mx-2 rounded hover:bg-background-secondary/50',
        showAvatar ? 'mt-4' : 'mt-0'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar column */}
      <div className="w-10 flex-shrink-0">
        {showAvatar ? (
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-medium">
            {message.author?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {timestamp}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-text-normal hover:underline cursor-pointer">
              {message.author?.displayName || 'Unknown'}
            </span>
            <span className="text-xs text-text-muted" title={fullTimestamp}>
              {timestamp}
            </span>
            {message.isEdited && (
              <span className="text-[10px] text-text-muted">(edited)</span>
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className="flex items-center gap-2 mb-1 text-sm text-text-muted">
            <Reply size={12} className="rotate-180" />
            <span className="font-medium">{message.replyTo.author?.displayName}</span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditContent(message.content);
                }
              }}
              className="w-full p-2 bg-background-tertiary rounded resize-none focus:outline-none focus:ring-1 focus:ring-brand"
              rows={2}
              autoFocus
            />
            <div className="text-xs text-text-muted mt-1">
              escape to <button onClick={() => setIsEditing(false)} className="text-text-link">cancel</button>
              {' • '}enter to <button onClick={handleEdit} className="text-text-link">save</button>
            </div>
          </div>
        ) : (
          <div className="text-text-normal whitespace-pre-wrap break-words prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={clsx(
                  'px-2 py-0.5 rounded text-sm flex items-center gap-1 border',
                  reaction.users.includes(user?.id || '')
                    ? 'bg-brand/20 border-brand text-brand'
                    : 'bg-background-tertiary border-transparent hover:border-interactive-muted'
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !isEditing && (
        <div className="absolute -top-4 right-2 flex items-center gap-0.5 p-0.5 bg-background-secondary border border-background-tertiary rounded shadow-lg">
          <button
            onClick={() => handleReaction('👍')}
            className="p-1.5 hover:bg-background-primary rounded text-interactive-normal hover:text-interactive-hover"
            title="Add reaction"
          >
            <Smile size={18} />
          </button>
          {isAuthor && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-background-primary rounded text-interactive-normal hover:text-interactive-hover"
                title="Edit"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-background-primary rounded text-status-dnd hover:text-status-dnd"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button
            className="p-1.5 hover:bg-background-primary rounded text-interactive-normal hover:text-interactive-hover"
            title="More"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      )}
    </div>
  );
}`);

writeFile('apps/web/src/components/chat/MessageInput.tsx', `import { useState, useRef, useEffect } from 'react';
import { PlusCircle, Gift, Sticker, Smile, Send } from 'lucide-react';
import { sendMessage, startTyping, stopTyping } from '../../services/socket';

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(channelId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(channelId);
    }, 3000);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    sendMessage(channelId, content.trim());
    setContent('');
    setIsTyping(false);
    stopTyping(channelId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex items-start gap-4 px-4 py-2 bg-background-tertiary rounded-lg">
        <button className="text-interactive-normal hover:text-interactive-hover p-1">
          <PlusCircle size={24} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message #channel"
          className="flex-1 bg-transparent resize-none text-text-normal placeholder:text-text-muted focus:outline-none max-h-[200px]"
          rows={1}
        />

        <div className="flex items-center gap-2">
          <button className="text-interactive-normal hover:text-interactive-hover p-1">
            <Gift size={24} />
          </button>
          <button className="text-interactive-normal hover:text-interactive-hover p-1">
            <Sticker size={24} />
          </button>
          <button className="text-interactive-normal hover:text-interactive-hover p-1">
            <Smile size={24} />
          </button>
          {content.trim() && (
            <button 
              onClick={handleSubmit}
              className="text-brand hover:text-brand-hover p-1"
            >
              <Send size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}`);

writeFile('apps/web/src/components/chat/TypingIndicator.tsx', `import type { User } from '@nexus/shared';

interface TypingIndicatorProps {
  users: User[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return <><strong>{users[0].displayName}</strong> is typing...</>;
    }
    if (users.length === 2) {
      return <><strong>{users[0].displayName}</strong> and <strong>{users[1].displayName}</strong> are typing...</>;
    }
    return <>Several people are typing...</>;
  };

  return (
    <div className="flex items-center gap-2 text-sm text-text-muted h-6">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}`);

writeFile('apps/web/src/components/chat/DMChatArea.tsx', `import { format } from 'date-fns';
import type { Message } from '@nexus/shared';
import ReactMarkdown from 'react-markdown';

interface DMChatAreaProps {
  messages: Message[];
}

export function DMChatArea({ messages }: DMChatAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-muted">
          <p>This is the beginning of your direct message history.</p>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="flex gap-4 py-1 hover:bg-background-secondary/50 px-2 -mx-2 rounded">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white flex-shrink-0">
              {message.author?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{message.author?.displayName || 'Unknown'}</span>
                <span className="text-xs text-text-muted">
                  {format(new Date(message.createdAt), 'h:mm a')}
                </span>
              </div>
              <div className="text-text-normal whitespace-pre-wrap break-words">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}`);

writeFile('apps/web/src/components/chat/DMMessageInput.tsx', `import { useState, useRef, useEffect } from 'react';
import { PlusCircle, Smile, Send } from 'lucide-react';

interface DMMessageInputProps {
  onSend: (content: string) => void;
}

export function DMMessageInput({ onSend }: DMMessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSend(content.trim());
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex items-start gap-4 px-4 py-2 bg-background-tertiary rounded-lg">
        <button className="text-interactive-normal hover:text-interactive-hover p-1">
          <PlusCircle size={24} />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          className="flex-1 bg-transparent resize-none text-text-normal placeholder:text-text-muted focus:outline-none max-h-[200px]"
          rows={1}
        />
        <div className="flex items-center gap-2">
          <button className="text-interactive-normal hover:text-interactive-hover p-1">
            <Smile size={24} />
          </button>
          {content.trim() && (
            <button 
              onClick={handleSubmit}
              className="text-brand hover:text-brand-hover p-1"
            >
              <Send size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}`);

console.log('\n✅ Chat components created!');
