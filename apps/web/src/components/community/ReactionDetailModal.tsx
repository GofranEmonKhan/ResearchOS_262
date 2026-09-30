import React, { useState, useEffect } from 'react';
import { X, Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';
import { ReactionUser, ForumTargetType } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { REACTION_OPTIONS } from './ReactionPicker.js';
import { getAuthToken } from '../../lib/api.js';

interface ReactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ForumTargetType;
  targetId: string;
  onSelectUser?: (userId: string) => void;
  initialReactors?: ReactionUser[];
}

export const ReactionDetailModal: React.FC<ReactionDetailModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  onSelectUser,
  initialReactors,
}) => {
  const [reactors, setReactors] = useState<ReactionUser[]>(initialReactors || []);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(!initialReactors);

  useEffect(() => {
    if (!isOpen) return;

    const fetchReactors = async () => {
      setIsLoading(true);
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/forum/votes/${targetType}/${targetId}/reactors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setReactors(data);
        }
      } catch (err) {
        console.error('Failed to load reactors:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReactors();
  }, [isOpen, targetType, targetId]);

  if (!isOpen) return null;

  const filteredReactors = selectedFilter === 'all'
    ? reactors
    : reactors.filter(r => r.value === selectedFilter);

  // Group counts
  const reactionCounts: Record<string, number> = { all: reactors.length };
  reactors.forEach(r => {
    reactionCounts[r.value] = (reactionCounts[r.value] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E0D1B] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Reactions & Endorsements</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 overflow-x-auto no-scrollbar bg-black/20">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All ({reactionCounts.all || 0})
          </button>

          {REACTION_OPTIONS.map((opt) => {
            const count = reactionCounts[opt.value] || 0;
            if (count === 0) return null;

            return (
              <button
                key={opt.value}
                onClick={() => setSelectedFilter(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                  selectedFilter === opt.value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Reactor List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReactors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No reactions in this category yet.
            </div>
          ) : (
            filteredReactors.map((r) => {
              const option = REACTION_OPTIONS.find(o => o.value === r.value);
              const isSupervisor = r.role === 'Supervisor';
              const isAdmin = r.role === 'Admin';

              return (
                <div
                  key={`${r.userId}-${r.value}`}
                  onClick={() => onSelectUser?.(r.userId)}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar
                        name={r.fullName}
                        photoUrl={r.photoUrl}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm bg-black/80 rounded-full p-0.5 shadow">
                        {option?.emoji || '👍'}
                      </span>
                    </div>


                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {r.fullName}
                        </span>

                        {isSupervisor && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            <GraduationCap className="w-3 h-3" />
                            Faculty
                          </span>
                        )}

                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        Reacted with <span className="font-medium text-slate-300">{option?.label || r.value}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
