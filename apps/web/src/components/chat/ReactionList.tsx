import { Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

interface Reaction {
  emoji: string;
  emojiId?: string;
  emojiAnimated?: boolean;
  count: number;
  userIds: string[];
  me?: boolean;
}

interface ReactionListProps {
  reactions: Reaction[];
  messageId: string;
  channelId: string;
  onAddReaction: () => void;
}

export default function ReactionList({ reactions, messageId, channelId, onAddReaction }: ReactionListProps) {
  const currentUser = useAuthStore((state) => state.user);

  const handleReactionClick = async (emoji: string, hasReacted: boolean) => {
    try {
      const method = hasReacted ? 'DELETE' : 'PUT';
      await fetch(
        `http://localhost:3001/api/v1/messages/${channelId}/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        { method, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = currentUser ? reaction.userIds.includes(currentUser.id) : false;
        
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji, hasReacted)}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-sm transition
              ${hasReacted 
                ? 'bg-[rgba(88,101,242,0.3)] border border-dc-blurple text-dc-blurple' 
                : 'bg-dc-secondary border border-transparent hover:border-dc-border'
              }
            `}
            title={`${reaction.count} ${reaction.count === 1 ? 'person' : 'people'} reacted`}
          >
            <span className="text-base">{reaction.emoji}</span>
            <span className={hasReacted ? 'text-dc-blurple' : 'text-dc-muted'}>{reaction.count}</span>
          </button>
        );
      })}
      
      {/* Add reaction button */}
      <button
        onClick={onAddReaction}
        className="flex items-center justify-center w-7 h-6 rounded bg-dc-secondary border border-transparent hover:border-dc-border transition text-dc-muted hover:text-dc-normal"
        title="Add Reaction"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
