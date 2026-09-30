import React, { useState } from 'react';
import { ForumVoteValue } from '@researchos/shared-types';

export interface ReactionOption {
  value: ForumVoteValue;
  label: string;
  emoji: string;
  color: string;
  bgHover: string;
}

export const REACTION_OPTIONS: ReactionOption[] = [
  { value: 'Like', label: 'Like', emoji: '👍', color: 'text-blue-400', bgHover: 'hover:bg-blue-500/20' },
  { value: 'Love', label: 'Love', emoji: '❤️', color: 'text-rose-400', bgHover: 'hover:bg-rose-500/20' },
  { value: 'Insightful', label: 'Insightful', emoji: '💡', color: 'text-amber-400', bgHover: 'hover:bg-amber-500/20' },
  { value: 'Celebrate', label: 'Celebrate', emoji: '👏', color: 'text-emerald-400', bgHover: 'hover:bg-emerald-500/20' },
  { value: 'Curious', label: 'Curious', emoji: '🤔', color: 'text-purple-400', bgHover: 'hover:bg-purple-500/20' },
  { value: 'Support', label: 'Support', emoji: '🤝', color: 'text-teal-400', bgHover: 'hover:bg-teal-500/20' },
];

interface ReactionPickerProps {
  currentReaction?: ForumVoteValue | null;
  onSelectReaction: (val: ForumVoteValue) => void;
  onRetractReaction?: () => void;
  className?: string;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  currentReaction,
  onSelectReaction,
  onRetractReaction,
  className = '',
}) => {
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-[#0F0E1D]/95 backdrop-blur-xl border border-indigo-500/30 rounded-full shadow-2xl shadow-indigo-950/60 animate-in fade-in zoom-in-90 duration-150 select-none ${className}`}
    >
      {REACTION_OPTIONS.map((reaction) => {
        const isSelected = currentReaction === reaction.value;
        const isHovered = hoveredReaction === reaction.value;

        return (
          <button
            key={reaction.value}
            type="button"
            onMouseEnter={() => setHoveredReaction(reaction.value)}
            onMouseLeave={() => setHoveredReaction(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (isSelected && onRetractReaction) {
                onRetractReaction();
              } else {
                onSelectReaction(reaction.value);
              }
            }}
            className={`relative group p-2 rounded-full transition-all duration-200 transform ${
              isHovered ? 'scale-125 -translate-y-1.5 z-10' : 'hover:scale-110'
            } ${isSelected ? 'bg-indigo-500/30 ring-2 ring-indigo-400' : reaction.bgHover}`}
            title={reaction.label}
          >
            <span className="text-xl leading-none transition-transform select-none drop-shadow-md">
              {reaction.emoji}
            </span>

            {/* Floating Tooltip */}
            {isHovered && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-white/10 text-[11px] font-semibold text-white rounded-md whitespace-nowrap shadow-lg animate-in fade-in duration-100 pointer-events-none">
                {reaction.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
