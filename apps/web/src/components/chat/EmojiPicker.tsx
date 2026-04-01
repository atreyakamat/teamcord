import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

// Common emojis organized by category
const EMOJI_DATA = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['⭐', '🌟', '✨', '💫', '🔥', '💯', '✅', '❌', '⚡', '💡', '🎉', '🎊', '🎁', '🏆', '🥇', '🥈', '🥉', '⚠️', '❓', '❗', '💬', '💭', '👁️‍🗨️', '🔔', '🔕'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '☕', '🍵'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Smileys');

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_DATA;
    
    const result: Record<string, string[]> = {};
    Object.entries(EMOJI_DATA).forEach(([category, emojis]) => {
      const filtered = emojis.filter(emoji => emoji.includes(search));
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    });
    return result;
  }, [search]);

  const categories = Object.keys(EMOJI_DATA);

  return (
    <div className="absolute right-0 top-full mt-2 w-[352px] rounded-lg bg-[#2b2d31] shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-dc-border">
        <div className="flex-grow relative">
          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-dc-muted" />
          <input
            type="text"
            placeholder="Search Emoji"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dc-tertiary rounded px-8 py-1.5 text-sm text-dc-normal placeholder:text-dc-muted focus:outline-none"
            autoFocus
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dc-muted hover:text-dc-normal"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      {!search && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-dc-border overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs font-medium rounded transition whitespace-nowrap ${
                selectedCategory === category 
                  ? 'bg-dc-selected text-white' 
                  : 'text-dc-muted hover:bg-dc-hover hover:text-dc-normal'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="h-[280px] overflow-y-auto p-2">
        {Object.entries(filteredEmojis).map(([category, emojis]) => (
          <div key={category} className="mb-3">
            <h3 className="text-xs font-bold text-dc-muted uppercase tracking-wide px-1 mb-1">
              {category}
            </h3>
            <div className="grid grid-cols-8 gap-0.5">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="flex items-center justify-center h-9 w-9 text-2xl rounded hover:bg-dc-hover transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(filteredEmojis).length === 0 && (
          <div className="flex items-center justify-center h-full text-dc-muted">
            No emojis found
          </div>
        )}
      </div>

      {/* Footer - Quick Reactions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-dc-border bg-dc-tertiary">
        <span className="text-xs text-dc-muted">Quick Reactions</span>
        <div className="flex gap-1">
          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
