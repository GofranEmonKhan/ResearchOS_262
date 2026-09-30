import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Send,
  CornerDownRight,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowBigUp,
  ArrowBigDown,
  Award,
  Loader2,
} from 'lucide-react';
import { ForumAnswer, ForumComment, ForumVoteValue } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { ReactionPicker, REACTION_OPTIONS } from './ReactionPicker.js';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog.js';
import { getAuthToken } from '../../lib/api.js';

interface InlineDiscussionTrayProps {
  postId: string;
  currentUserId?: string;
  userRole?: string;
  isPostAuthor?: boolean;
  isFacultyVerified?: boolean;
  onAnswerCountChange?: (count: number) => void;
  onSelectAuthor?: (authorId: string) => void;
  onOpenReactors?: (targetType: 'Post' | 'Answer', targetId: string) => void;
  onReport?: (targetType: 'Post' | 'Answer' | 'Comment', targetId: string) => void;
}

export const InlineDiscussionTray: React.FC<InlineDiscussionTrayProps> = ({
  postId,
  currentUserId,
  userRole,
  isPostAuthor,
  isFacultyVerified,
  onAnswerCountChange,
  onSelectAuthor,
  onOpenReactors,
  onReport: _onReport,
}) => {
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAnswerBody, setNewAnswerBody] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Edit Answer State
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerBody, setEditingAnswerBody] = useState('');
  const [isUpdatingAnswer, setIsUpdatingAnswer] = useState(false);

  // Comments State per Answer
  const [commentsMap, setCommentsMap] = useState<Record<string, ForumComment[]>>({});
  const [expandedCommentsMap, setExpandedCommentsMap] = useState<Record<string, boolean>>({});
  const [newCommentBodyMap, setNewCommentBodyMap] = useState<Record<string, string>>({});
  const [isSubmittingCommentMap, setIsSubmittingCommentMap] = useState<Record<string, boolean>>({});

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  const [activePickerTarget, setActivePickerTarget] = useState<string | null>(null);

  // Delete Confirmation State (In-system dialog)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'Answer' | 'Comment';
    id: string;
    answerId?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnswers = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/posts/${postId}/answers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ForumAnswer[] = await res.json();
        setAnswers(data);
        if (onAnswerCountChange) {
          onAnswerCountChange(data.length);
        }
      }
    } catch (err) {
      console.error('Failed to load answers for post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswers();
  }, [postId]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswerBody.trim() || newAnswerBody.trim().length < 5 || isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/posts/${postId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: newAnswerBody.trim() }),
      });

      if (res.ok) {
        const created: ForumAnswer = await res.json();
        setAnswers((prev) => [...prev, created]);
        setNewAnswerBody('');
        if (onAnswerCountChange) {
          onAnswerCountChange(answers.length + 1);
        }
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleUpdateAnswer = async (answerId: string) => {
    if (!editingAnswerBody.trim() || isUpdatingAnswer) return;
    setIsUpdatingAnswer(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/answers/${answerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: editingAnswerBody.trim() }),
      });

      if (res.ok) {
        const updated: ForumAnswer = await res.json();
        setAnswers((prev) =>
          prev.map((a) => (a.id === answerId ? { ...a, body: updated.body, updatedAt: updated.updatedAt } : a))
        );
        setEditingAnswerId(null);
        setEditingAnswerBody('');
      }
    } catch (err) {
      console.error('Failed to update answer:', err);
    } finally {
      setIsUpdatingAnswer(false);
    }
  };

  const handleDeleteAnswer = (answerId: string) => {
    setDeleteTarget({ type: 'Answer', id: answerId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      if (deleteTarget.type === 'Answer') {
        const res = await fetch(`/api/forum/answers/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setAnswers((prev) => prev.filter((a) => a.id !== deleteTarget.id));
          if (onAnswerCountChange) {
            onAnswerCountChange(Math.max(0, answers.length - 1));
          }
          setDeleteTarget(null);
        }
      } else if (deleteTarget.type === 'Comment' && deleteTarget.answerId) {
        const res = await fetch(`/api/forum/comments/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCommentsMap((prev) => ({
            ...prev,
            [deleteTarget.answerId!]: (prev[deleteTarget.answerId!] || []).filter((c) => c.id !== deleteTarget.id),
          }));
          setDeleteTarget(null);
        }
      }
    } catch (err) {
      console.error(`Failed to delete ${deleteTarget.type.toLowerCase()}:`, err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string, currentAccepted: boolean) => {
    try {
      const token = await getAuthToken();
      const endpoint = currentAccepted ? 'unaccept' : 'accept';
      const res = await fetch(`/api/forum/answers/${answerId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? { ...a, isAccepted: !currentAccepted }
              : currentAccepted
              ? a
              : { ...a, isAccepted: false }
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle accept answer:', err);
    }
  };

  const handleExpertVerify = async (answerId: string, currentVerified: boolean) => {
    try {
      const token = await getAuthToken();
      const endpoint = currentVerified ? 'revoke-verify' : 'expert-verify';
      const res = await fetch(`/api/forum/answers/${answerId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? {
                  ...a,
                  expertVerifiedBy: currentVerified ? null : currentUserId,
                  expertVerifiedAt: currentVerified ? null : new Date().toISOString(),
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle expert verification:', err);
    }
  };

  const handleVoteAnswer = async (answerId: string, value: ForumVoteValue) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/Answer/${answerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const { reactions } = await res.json();
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? {
                  ...a,
                  currentUserReaction: value,
                  score: (reactions.up || 0) - (reactions.down || 0),
                  reactions,
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to vote answer:', err);
    } finally {
      setActivePickerTarget(null);
    }
  };

  const handleRetractAnswerVote = async (answerId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/Answer/${answerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { reactions } = await res.json();
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? {
                  ...a,
                  currentUserReaction: null,
                  currentUserVote: null,
                  score: (reactions.up || 0) - (reactions.down || 0),
                  reactions,
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error('Failed to retract answer vote:', err);
    } finally {
      setActivePickerTarget(null);
    }
  };

  // ────────────────────────── COMMENTS FOR ANSWERS ──────────────────────────

  const toggleComments = async (answerId: string) => {
    const isExpanded = !!expandedCommentsMap[answerId];
    setExpandedCommentsMap((prev) => ({ ...prev, [answerId]: !isExpanded }));

    if (!isExpanded && !commentsMap[answerId]) {
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/forum/comments/Answer/${answerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: ForumComment[] = await res.json();
          setCommentsMap((prev) => ({ ...prev, [answerId]: data }));
        }
      } catch (err) {
        console.error('Failed to fetch comments for answer:', err);
      }
    }
  };

  const handleAddComment = async (answerId: string) => {
    const body = (newCommentBodyMap[answerId] || '').trim();
    if (!body) return;

    setIsSubmittingCommentMap((prev) => ({ ...prev, [answerId]: true }));
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/comments/Answer/${answerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const created: ForumComment = await res.json();
        setCommentsMap((prev) => ({
          ...prev,
          [answerId]: [...(prev[answerId] || []), created],
        }));
        setNewCommentBodyMap((prev) => ({ ...prev, [answerId]: '' }));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingCommentMap((prev) => ({ ...prev, [answerId]: false }));
    }
  };

  const handleUpdateComment = async (commentId: string, answerId: string) => {
    const body = editingCommentBody.trim();
    if (!body) return;

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const updated: ForumComment = await res.json();
        setCommentsMap((prev) => ({
          ...prev,
          [answerId]: (prev[answerId] || []).map((c) =>
            c.id === commentId ? { ...c, body: updated.body, updatedAt: updated.updatedAt } : c
          ),
        }));
        setEditingCommentId(null);
        setEditingCommentBody('');
      }
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleDeleteComment = (commentId: string, answerId: string) => {
    setDeleteTarget({ type: 'Comment', id: commentId, answerId });
  };

  return (
    <div className="border-t border-white/10 bg-[#080712]/95 backdrop-blur-md px-4 sm:px-6 py-4 space-y-4 animate-in fade-in duration-200">
      {/* ─── Inline Answer Composer ─── */}
      <form onSubmit={handleSubmitAnswer} className="flex gap-3 items-start">
        <UserAvatar
          name={currentUserId ? 'You' : 'Scholar'}
          size="sm"
          className="ring-1 ring-white/10 shrink-0 mt-1"
        />
        <div className="flex-1 relative">
          <textarea
            value={newAnswerBody}
            onChange={(e) => setNewAnswerBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                handleSubmitAnswer(e);
              }
            }}
            placeholder="Write a scientific answer, resolution, or observation... (Cmd/Ctrl + Enter to submit)"
            rows={Math.max(2, Math.min(6, newAnswerBody.split('\n').length))}
            className="w-full px-3.5 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-black/50 border border-white/10 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500">
            <span>Markdown supported</span>
            <button
              type="submit"
              disabled={!newAnswerBody.trim() || newAnswerBody.trim().length < 5 || isSubmittingAnswer}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSubmittingAnswer ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Post Answer</span>
            </button>
          </div>
        </div>
      </form>

      {/* ─── Answers Thread ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Loading scientific discussion thread...</span>
        </div>
      ) : answers.length === 0 ? (
        <div className="text-center py-5 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
          <p className="text-xs text-slate-400 font-medium">No answers yet for this question.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Be the first to share an academic resolution!</p>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-white/5">
            <span>{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</span>
            <span className="text-[10px] lowercase text-slate-500">Sorted by verified & votes</span>
          </div>

          {answers.map((answer) => {
            const isAnswerAuthor = currentUserId === answer.authorId;
            const canEditOrDelete = isAnswerAuthor || userRole === 'Admin';
            const isAccepted = answer.isAccepted;
            const isVerified = !!answer.expertVerifiedBy;
            const isEditingThis = editingAnswerId === answer.id;
            const isCommentsExpanded = !!expandedCommentsMap[answer.id];
            const answerComments = commentsMap[answer.id] || [];
            const isPickerOpen = activePickerTarget === answer.id;

            const currentReactionOption = REACTION_OPTIONS.find(
              (r) => r.value === answer.currentUserReaction
            );

            return (
              <div
                key={answer.id}
                className={`rounded-xl p-4 border transition-all ${
                  isAccepted
                    ? 'bg-emerald-950/15 border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : isVerified
                    ? 'bg-purple-950/15 border-purple-500/30'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/15'
                }`}
              >
                {/* Header: Author & Seals */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectAuthor && onSelectAuthor(answer.authorId)}
                      className="shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <UserAvatar
                        name={answer.author?.fullName || 'Scholar'}
                        photoUrl={answer.author?.photoUrl || undefined}
                        size="sm"
                      />
                    </button>
                    <div className="min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onSelectAuthor && onSelectAuthor(answer.authorId)}
                          className="text-xs font-bold text-white hover:text-indigo-400 transition-colors truncate"
                        >
                          {answer.author?.fullName || 'Anonymous Scholar'}
                        </button>
                        {answer.author?.isFacultyVerified && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            <GraduationCap className="w-2.5 h-2.5" />
                            Faculty
                          </span>
                        )}
                        <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          {answer.author?.reputationPoints || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{answer.author?.institution || 'Academic Lab'}</span>
                        <span>•</span>
                        <span>{new Date(answer.createdAt).toLocaleDateString()}</span>
                        {answer.updatedAt && answer.updatedAt !== answer.createdAt && (
                          <span className="text-slate-500 italic">(edited)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAccepted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950">
                        <CheckCircle2 className="w-3 h-3" />
                        Accepted
                      </span>
                    )}

                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-950">
                        <Award className="w-3 h-3" />
                        Supervisor Verified
                      </span>
                    )}

                    {/* Author Edit/Delete Controls */}
                    {canEditOrDelete && !isEditingThis && (
                      <div className="flex items-center gap-1 ml-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnswerId(answer.id);
                            setEditingAnswerBody(answer.body);
                          }}
                          className="p-1 hover:text-white rounded hover:bg-white/5 transition-colors"
                          title="Edit answer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnswer(answer.id)}
                          className="p-1 hover:text-rose-400 rounded hover:bg-white/5 transition-colors"
                          title="Delete answer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body or Inline Editor */}
                {isEditingThis ? (
                  <div className="space-y-2 my-2">
                    <textarea
                      value={editingAnswerBody}
                      onChange={(e) => setEditingAnswerBody(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-black/60 border border-indigo-500/50 rounded-xl text-xs text-white focus:outline-none resize-none font-sans"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAnswerId(null);
                          setEditingAnswerBody('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAnswer(answer.id)}
                        disabled={!editingAnswerBody.trim() || isUpdatingAnswer}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
                      >
                        {isUpdatingAnswer ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pl-1 my-2">
                    {answer.body}
                  </div>
                )}

                {/* Footer Controls: Reactions, Comments, Accept, Verify */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 relative">
                    {/* Professional Upvote & Downvote Pill for Answer */}
                    <div className="flex items-center bg-[#131224] border border-white/10 hover:border-indigo-500/30 rounded-xl p-0.5 shadow-inner transition-colors">
                      <button
                        type="button"
                        onClick={() => {
                          if (answer.currentUserReaction === 'Up') {
                            handleRetractAnswerVote(answer.id);
                          } else {
                            handleVoteAnswer(answer.id, 'Up');
                          }
                        }}
                        className={`p-1 rounded-lg transition-all flex items-center justify-center ${
                          answer.currentUserReaction === 'Up'
                            ? 'text-emerald-400 bg-emerald-500/20 shadow-sm shadow-emerald-500/30'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
                        }`}
                        title="Upvote Answer"
                      >
                        <ArrowBigUp className={`w-3.5 h-3.5 transition-transform active:scale-125 ${answer.currentUserReaction === 'Up' ? 'fill-current' : ''}`} />
                      </button>
                      <span className={`px-1.5 text-[11px] font-extrabold font-mono tracking-tight ${
                        answer.currentUserReaction === 'Up'
                          ? 'text-emerald-400'
                          : answer.currentUserReaction === 'Down'
                          ? 'text-rose-400'
                          : (answer.score || 0) > 0
                          ? 'text-emerald-300'
                          : (answer.score || 0) < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}>
                        {answer.score || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (answer.currentUserReaction === 'Down') {
                            handleRetractAnswerVote(answer.id);
                          } else {
                            handleVoteAnswer(answer.id, 'Down');
                          }
                        }}
                        className={`p-1 rounded-lg transition-all flex items-center justify-center ${
                          answer.currentUserReaction === 'Down'
                            ? 'text-rose-400 bg-rose-500/20 shadow-sm shadow-rose-500/30'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-white/10'
                        }`}
                        title="Downvote Answer"
                      >
                        <ArrowBigDown className={`w-3.5 h-3.5 transition-transform active:scale-125 ${answer.currentUserReaction === 'Down' ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Reaction Trigger Button */}
                    <div
                      className="relative"
                      onMouseEnter={() => setActivePickerTarget(answer.id)}
                      onMouseLeave={() => setActivePickerTarget(null)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (answer.currentUserReaction) {
                            handleRetractAnswerVote(answer.id);
                          } else {
                            handleVoteAnswer(answer.id, 'Like');
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          currentReactionOption
                            ? `${currentReactionOption.color} bg-white/5 font-bold`
                            : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{currentReactionOption ? currentReactionOption.emoji : '👍'}</span>
                        <span>{currentReactionOption ? currentReactionOption.label : 'React'}</span>
                      </button>

                      {/* Floating Multi-Reaction Bar on Hover */}
                      {isPickerOpen && (
                        <div className="absolute bottom-full left-0 mb-1 z-30">
                          <ReactionPicker
                            currentReaction={answer.currentUserReaction}
                            onSelectReaction={(val) => handleVoteAnswer(answer.id, val)}
                            onRetractReaction={() => handleRetractAnswerVote(answer.id)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Reaction counts breakdown trigger */}
                    {answer.reactions && (
                      <button
                        type="button"
                        onClick={() => onOpenReactors && onOpenReactors('Answer', answer.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="font-mono">{answer.score || 0}</span>
                      </button>
                    )}

                    {/* Sub-comments toggle */}
                    <button
                      type="button"
                      onClick={() => toggleComments(answer.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{answerComments.length > 0 ? `${answerComments.length} comments` : 'Comment'}</span>
                      {isCommentsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Faculty & Author Workflow Badges */}
                  <div className="flex items-center gap-2">
                    {/* Post Author: Accept Answer */}
                    {isPostAuthor && !isAnswerAuthor && (
                      <button
                        type="button"
                        onClick={() => handleAcceptAnswer(answer.id, isAccepted)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-white/10'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isAccepted ? 'Accepted Solution' : 'Accept as Solution'}</span>
                      </button>
                    )}

                    {/* Active Supervisor: Expert Verification */}
                    {isFacultyVerified && (
                      <button
                        type="button"
                        onClick={() => handleExpertVerify(answer.id, isVerified)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isVerified
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-white/5 hover:bg-purple-500/10 text-slate-300 hover:text-purple-300 border border-white/10'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span>{isVerified ? 'Expert Verified' : 'Verify as Expert'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Nested Sub-Comments ─── */}
                {isCommentsExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/5 pl-4 border-l-2 border-l-indigo-500/20 space-y-2.5 animate-in fade-in duration-150">
                    {/* Comments List */}
                    {answerComments.map((comment) => {
                      const isCommentAuthor = currentUserId === comment.authorId;
                      const canEditComment = isCommentAuthor || userRole === 'Admin';
                      const isEditingThisComment = editingCommentId === comment.id;

                      return (
                        <div key={comment.id} className="text-xs space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={comment.author?.fullName || 'Scholar'} size="sm" />
                              <span className="font-bold text-white text-[11px]">
                                {comment.author?.fullName || 'Scholar'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                <span className="text-[10px] text-slate-500 italic">(edited)</span>
                              )}
                            </div>

                            {canEditComment && !isEditingThisComment && (
                              <div className="flex items-center gap-1 text-slate-500">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditingCommentBody(comment.body);
                                  }}
                                  className="hover:text-white p-0.5"
                                  title="Edit comment"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id, answer.id)}
                                  className="hover:text-rose-400 p-0.5"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditingThisComment ? (
                            <div className="space-y-1.5 pt-1">
                              <input
                                type="text"
                                value={editingCommentBody}
                                onChange={(e) => setEditingCommentBody(e.target.value)}
                                className="w-full px-2.5 py-1 bg-black/60 border border-indigo-500/40 rounded text-xs text-white"
                              />
                              <div className="flex justify-end gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-2 py-0.5 text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateComment(comment.id, answer.id)}
                                  className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-300 text-[11px] leading-relaxed pl-1">
                              {comment.body}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Comment Input */}
                    <div className="flex gap-2 items-center pt-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input
                        type="text"
                        value={newCommentBodyMap[answer.id] || ''}
                        onChange={(e) =>
                          setNewCommentBodyMap((prev) => ({ ...prev, [answer.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(answer.id);
                          }
                        }}
                        placeholder="Write an inline reply/comment... (Press Enter)"
                        className="flex-1 px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        disabled={!(newCommentBodyMap[answer.id] || '').trim() || isSubmittingCommentMap[answer.id]}
                        onClick={() => handleAddComment(answer.id)}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition-all shrink-0"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* In-System Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type || ''}`}
        message={
          deleteTarget?.type === 'Answer'
            ? 'Are you sure you want to delete this answer? All sub-comments on this answer will also be deleted.'
            : 'Are you sure you want to delete this comment? This action cannot be undone.'
        }
        confirmText={`Delete ${deleteTarget?.type || ''}`}
        isDeleting={isDeleting}
      />
    </div>
  );
};
