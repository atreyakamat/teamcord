import { Plus } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

interface Reaction {
  emoji: string
  emojiId?: string
  emojiAnimated?: boolean
  count: number
  userIds: string[]
  me?: boolean
}

interface ReactionListProps {
  reactions: Reaction[]
  messageId: string
  channelId: string
  onAddReaction: () => void
}

export default function ReactionList({
  reactions,
  messageId,
  channelId,
  onAddReaction,
}: ReactionListProps) {
  const currentUser = useAuthStore((state) => state.user)

  const handleReactionClick = async (emoji: string, hasReacted: boolean) => {
    try {
      await apiFetch(
        `/api/v1/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        { method: hasReacted ? 'DELETE' : 'PUT' }
      )
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => {
        const hasReacted = currentUser ? reaction.userIds.includes(currentUser.id) : false

        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => handleReactionClick(reaction.emoji, hasReacted)}
            className={`
              flex items-center gap-1 rounded px-2 py-0.5 text-sm transition
              ${
                hasReacted
                  ? 'border border-dc-blurple bg-[rgba(88,101,242,0.3)] text-dc-blurple'
                  : 'border border-transparent bg-dc-secondary hover:border-dc-border'
              }
            `}
            title={`${reaction.count} ${reaction.count === 1 ? 'person' : 'people'} reacted`}
          >
            <span className="text-base">{reaction.emoji}</span>
            <span className={hasReacted ? 'text-dc-blurple' : 'text-dc-muted'}>
              {reaction.count}
            </span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onAddReaction}
        className="flex h-6 w-7 items-center justify-center rounded border border-transparent bg-dc-secondary text-dc-muted transition hover:border-dc-border hover:text-dc-normal"
        title="Add reaction"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
