import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowBigUp,
  ArrowBigDown,
  Pin,
  Lock,
  Send,
  CornerDownRight,
  Check,
  Award,
  Flag,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { ForumPost, ForumAnswer, ForumComment, ForumVoteValue } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { ReactionPicker, REACTION_OPTIONS } from './ReactionPicker.js';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog.js';
import { getAuthToken } from '../../lib/api.js';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  userRole?: string;
  isFacultyVerified?: boolean;
  onSelectAuthor?: (authorId: string) => void;
  onSelectTag?: (tag: string) => void;
  onOpenReactors?: (targetType: 'Post' | 'Answer', targetId: string) => void;
  onReport?: (targetType: 'Post' | 'Answer' | 'Comment', targetId: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  postId,
  isOpen,
  onClose,
  currentUserId,
  userRole,
  onSelectAuthor,
  onSelectTag,
  onOpenReactors,
  onReport,
}) => {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newAnswerBody, setNewAnswerBody] = useState('');
  const [newCommentBody, setNewCommentBody] = useState('');
  const [activeCommentTarget, setActiveCommentTarget] = useState<{ type: 'Post' | 'Answer'; id: string } | null>(null);
  const [activeReactionTarget, setActiveReactionTarget] = useState<{ type: 'Post' | 'Answer'; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Edit states
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerBody, setEditingAnswerBody] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // In-System Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'Answer' | 'Comment';
    id: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const isPostAuthor = currentUserId === post?.authorId;
  const isSupervisorOrAdmin = userRole === 'Supervisor' || userRole === 'Admin';

  const fetchPostDetails = async () => {
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [postRes, answersRes, commentsRes] = await Promise.all([
        fetch(`/api/forum/posts/${postId}`, { headers }),
        fetch(`/api/forum/posts/${postId}/answers`, { headers }),
        fetch(`/api/forum/comments/Post/${postId}`, { headers }),
      ]);

      if (postRes.ok) {
        const postData = await postRes.json();
        setPost(postData);
      }
      if (answersRes.ok) {
        const answersData = await answersRes.json();
        setAnswers(answersData);
      }
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (err) {
      console.error('Failed to load post details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && postId) {
      setIsLoading(true);
      fetchPostDetails();
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  const handleVote = async (targetType: 'Post' | 'Answer', targetId: string, value: ForumVoteValue) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/${targetType}/${targetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      if (res.ok) {
        const { reactions } = await res.json();
        if (targetType === 'Post' && post) {
          setPost({
            ...post,
            currentUserReaction: value,
            score: reactions.up - reactions.down,
            reactions,
          });
        } else {
          setAnswers((prev) =>
            prev.map((a) =>
              a.id === targetId
                ? { ...a, currentUserReaction: value, score: reactions.up - reactions.down, reactions }
                : a
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  const handleRetractVote = async (targetType: 'Post' | 'Answer', targetId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/${targetType}/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const { reactions } = await res.json();
        if (targetType === 'Post' && post) {
          setPost({
            ...post,
            currentUserReaction: null,
            currentUserVote: null,
            score: reactions.up - reactions.down,
            reactions,
          });
        } else {
          setAnswers((prev) =>
            prev.map((a) =>
              a.id === targetId
                ? { ...a, currentUserReaction: null, currentUserVote: null, score: reactions.up - reactions.down, reactions }
                : a
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to retract vote:', err);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswerBody.trim() || newAnswerBody.trim().length < 5) return;

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
        setNewAnswerBody('');
        fetchPostDetails();
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsSubmittingAnswer(false);
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
        fetchPostDetails();
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
        fetchPostDetails();
      }
    } catch (err) {
      console.error('Failed to toggle expert verify:', err);
    }
  };

  const handleAddComment = async (targetType: 'Post' | 'Answer', targetId: string) => {
    if (!newCommentBody.trim()) return;

    setIsSubmittingComment(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/comments/${targetType}/${targetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });

      if (res.ok) {
        setNewCommentBody('');
        setActiveCommentTarget(null);
        fetchPostDetails();
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateAnswer = async (answerId: string) => {
    if (!editingAnswerBody.trim()) return;
    setIsSavingAnswer(true);
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
        setEditingAnswerId(null);
        fetchPostDetails();
      }
    } catch (err) {
      console.error('Failed to update answer:', err);
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleDeleteAnswer = (answerId: string) => {
    setDeleteTarget({ type: 'Answer', id: answerId });
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteTarget({ type: 'Comment', id: commentId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      const endpoint = deleteTarget.type === 'Answer'
        ? `/api/forum/answers/${deleteTarget.id}`
        : `/api/forum/comments/${deleteTarget.id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchPostDetails();
      }
    } catch (err) {
      console.error(`Failed to delete ${deleteTarget.type.toLowerCase()}:`, err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentBody.trim()) return;
    setIsSavingComment(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: editingCommentBody.trim() }),
      });
      if (res.ok) {
        setEditingCommentId(null);
        fetchPostDetails();
      }
    } catch (err) {
      console.error('Failed to update comment:', err);
    } finally {
      setIsSavingComment(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0B0A17] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-xl">
              {post?.title || 'Scientific Discussion'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : post ? (
            <>
              {/* Question / Post Section */}
              <div className="p-5 sm:p-6 bg-[#0F0E20] border border-white/10 rounded-2xl space-y-4">
                {/* Author Info Bar */}
                <div className="flex items-center justify-between gap-4">
                  <div
                    onClick={() => post.authorId && onSelectAuthor?.(post.authorId)}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <UserAvatar
                      name={post.author?.fullName || 'Scholar'}
                      photoUrl={post.author?.photoUrl}
                      size="md"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm hover:text-indigo-300 transition-colors">
                          {post.author?.fullName}
                        </span>
                        {post.author?.isFacultyVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            <GraduationCap className="w-3 h-3" />
                            Faculty
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-2.5 h-2.5" />
                          {post.author?.reputationPoints || 0}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {post.author?.institution || 'Researcher'} • Asked on{' '}
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    {post.isLocked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Editorial Blog Header Banner if scientific blog */}
                {(post.tags?.includes('scientific-blog') || post.tags?.includes('blog')) && (
                  <div className="flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-l-2 border-indigo-500 text-[11px] text-indigo-300 font-medium">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-[10px] text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Scientific Publication & Insights
                    </span>
                    <span className="text-slate-400">
                      {Math.max(1, Math.round(post.body.split(/\s+/).length / 200))} min read • Peer Review Open
                    </span>
                  </div>
                )}

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {post.title}
                </h2>

                {/* Body: Pure Text Display (Same as standard Q&A/Discussion post) */}
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {post.body.replace(/!\[.*?\]\(.*?\)/g, '').trim()}
                </div>

                {/* Attached Images / Screenshots / Diagrams */}
                {(() => {
                  const images: { alt: string; url: string }[] = [];
                  const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
                  let match;
                  while ((match = imgRegex.exec(post.body)) !== null) {
                    images.push({ alt: match[1], url: match[2] });
                  }
                  if (images.length === 0) return null;
                  return (
                    <div className="space-y-4 pt-3 border-t border-white/10">
                      {images.map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                          <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/5 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5 font-medium">
                              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                              {img.alt || 'Attached Screenshot or Diagram'}
                            </span>
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 text-[11px] underline"
                            >
                              Open Full Size
                            </a>
                          </div>
                          <div className="p-2 flex justify-center bg-black/25">
                            <img
                              src={img.url}
                              alt={img.alt || 'Attached image'}
                              className="max-h-[600px] w-auto max-w-full object-contain rounded-lg"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onSelectTag?.(tag)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/20 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Post Action Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {/* Professional Upvote & Downvote Pill for Post */}
                    <div className="flex items-center bg-[#131224] border border-white/10 hover:border-indigo-500/30 rounded-xl p-0.5 shadow-inner transition-colors">
                      <button
                        onClick={() => handleVote('Post', post.id, 'Up')}
                        className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                          post.currentUserReaction === 'Up'
                            ? 'text-emerald-400 bg-emerald-500/20 shadow-sm shadow-emerald-500/30'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
                        }`}
                        title="Upvote"
                      >
                        <ArrowBigUp className={`w-4 h-4 transition-transform active:scale-125 ${post.currentUserReaction === 'Up' ? 'fill-current' : ''}`} />
                      </button>
                      <span className={`px-2 text-xs font-extrabold font-mono tracking-tight ${
                        post.currentUserReaction === 'Up'
                          ? 'text-emerald-400'
                          : post.currentUserReaction === 'Down'
                          ? 'text-rose-400'
                          : (post.score || 0) > 0
                          ? 'text-emerald-300'
                          : (post.score || 0) < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}>
                        {post.score || 0}
                      </span>
                      <button
                        onClick={() => handleVote('Post', post.id, 'Down')}
                        className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                          post.currentUserReaction === 'Down'
                            ? 'text-rose-400 bg-rose-500/20 shadow-sm shadow-rose-500/30'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-white/10'
                        }`}
                        title="Downvote"
                      >
                        <ArrowBigDown className={`w-4 h-4 transition-transform active:scale-125 ${post.currentUserReaction === 'Down' ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* LinkedIn Reaction Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (post.currentUserReaction && post.currentUserReaction !== 'Up' && post.currentUserReaction !== 'Down') {
                            handleRetractVote('Post', post.id);
                          } else {
                            setActiveReactionTarget(
                              activeReactionTarget?.id === post.id ? null : { type: 'Post', id: post.id }
                            );
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
                          post.currentUserReaction && post.currentUserReaction !== 'Up' && post.currentUserReaction !== 'Down'
                            ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>
                          {post.currentUserReaction &&
                            REACTION_OPTIONS.find((r) => r.value === post.currentUserReaction)?.emoji || '👍'}
                        </span>
                        <span>React</span>
                      </button>

                      {activeReactionTarget?.id === post.id && (
                        <div className="absolute left-0 bottom-10 z-40">
                          <ReactionPicker
                            currentReaction={post.currentUserReaction}
                            onSelectReaction={(val) => {
                              setActiveReactionTarget(null);
                              handleVote('Post', post.id, val);
                            }}
                            onRetractReaction={() => {
                              setActiveReactionTarget(null);
                              handleRetractVote('Post', post.id);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Reactor Count Button */}
                    {(post.reactions?.totalReactions || 0) > 0 && (
                      <button
                        onClick={() => onOpenReactors?.('Post', post.id)}
                        className="text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors"
                      >
                        {post.reactions?.totalReactions} reactions
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setActiveCommentTarget(
                          activeCommentTarget?.id === post.id ? null : { type: 'Post', id: post.id }
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      Comment
                    </button>
                    <button
                      onClick={() => onReport?.('Post', post.id)}
                      className="p-1.5 text-slate-500 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
                      title="Report Content"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-Comments on Post */}
                {comments.length > 0 && (
                  <div className="pt-3 border-t border-white/5 space-y-2 pl-4">
                    {comments.map((c) => {
                      const canModifyComment = currentUserId === c.authorId || userRole === 'Admin';
                      const isCommentEdited = c.updatedAt && c.createdAt && new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime() + 1000;

                      return (
                        <div key={c.id} className="text-xs text-slate-300 bg-black/25 p-2.5 rounded-lg space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-indigo-300 shrink-0">
                                {c.author?.fullName || 'Scholar'}:
                              </span>
                              <span className="text-[10px] text-slate-500 shrink-0">
                                {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isCommentEdited && (
                                <span className="text-[9px] text-slate-500 italic">(edited)</span>
                              )}
                            </div>

                            {canModifyComment && editingCommentId !== c.id && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditingCommentBody(c.body);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-300 transition-colors"
                                  title="Edit comment"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {editingCommentId === c.id ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={editingCommentBody}
                                onChange={(e) => setEditingCommentBody(e.target.value)}
                                className="flex-1 px-2.5 py-1 bg-[#121124] border border-indigo-500/40 rounded-lg text-xs text-white focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateComment(c.id)}
                                disabled={isSavingComment || !editingCommentBody.trim()}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold"
                              >
                                {isSavingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="leading-relaxed text-slate-200">{c.body}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Post Comment Input Drawer */}
                {activeCommentTarget?.id === post.id && (
                  <div className="flex items-center gap-2 pt-2 animate-in fade-in">
                    <input
                      type="text"
                      value={newCommentBody}
                      onChange={(e) => setNewCommentBody(e.target.value)}
                      placeholder="Add a concise scientific comment or clarification..."
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment('Post', post.id);
                      }}
                    />
                    <button
                      onClick={() => handleAddComment('Post', post.id)}
                      disabled={isSubmittingComment || !newCommentBody.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>

              {/* Answers Section Header */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{answers.length} Solutions & Answers</span>
                  {post.hasAcceptedAnswer && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Solved
                    </span>
                  )}
                </h3>
              </div>

              {/* Answers Thread */}
              <div className="space-y-4">
                {answers.map((ans) => {
                  const isAccepted = ans.isAccepted;
                  const isExpertVerified = !!ans.expertVerifiedBy;
                  const canModifyAnswer = currentUserId === ans.authorId || userRole === 'Admin';
                  const isAnswerEdited = ans.updatedAt && ans.createdAt && new Date(ans.updatedAt).getTime() > new Date(ans.createdAt).getTime() + 1000;

                  return (
                    <div
                      key={ans.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isAccepted
                          ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : isExpertVerified
                          ? 'bg-violet-950/20 border-violet-500/40'
                          : 'bg-[#0E0D1F] border-white/10'
                      }`}
                    >
                      {/* Answer Badges Bar */}
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Accepted Solution (+15 Rep)
                            </span>
                          )}

                          {isExpertVerified && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                              <Award className="w-3.5 h-3.5" />
                              Expert Verified by {ans.expertVerifier?.fullName || 'Faculty'} (+20 Rep)
                            </span>
                          )}
                        </div>

                        {/* Special Role Action Buttons & Edit/Delete */}
                        <div className="flex items-center gap-2">
                          {/* Question author can Accept/Unaccept */}
                          {isPostAuthor && (
                            <button
                              onClick={() => handleAcceptAnswer(ans.id, isAccepted)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isAccepted
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-white/5 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/20 border border-white/10'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              {isAccepted ? 'Accepted' : 'Accept Solution'}
                            </button>
                          )}

                          {/* Supervisor can Expert Verify */}
                          {isSupervisorOrAdmin && (
                            <button
                              onClick={() => handleExpertVerify(ans.id, isExpertVerified)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isExpertVerified
                                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                                  : 'bg-white/5 text-slate-300 hover:text-violet-300 hover:bg-violet-500/20 border border-white/10'
                              }`}
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              {isExpertVerified ? 'Verified' : 'Verify as Expert'}
                            </button>
                          )}

                          {/* Author/Admin edit & delete actions */}
                          {canModifyAnswer && editingAnswerId !== ans.id && (
                            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                              <button
                                onClick={() => {
                                  setEditingAnswerId(ans.id);
                                  setEditingAnswerBody(ans.body);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-white/5 transition-colors"
                                title="Edit Answer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAnswer(ans.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Delete Answer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Answer Author */}
                      <div className="flex items-center gap-3 mb-3">
                        <UserAvatar
                          name={ans.author?.fullName || 'Scholar'}
                          photoUrl={ans.author?.photoUrl}
                          size="sm"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs">
                              {ans.author?.fullName}
                            </span>
                            {ans.author?.isFacultyVerified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                Faculty
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Sparkles className="w-2 h-2" />
                              {ans.author?.reputationPoints || 0}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {new Date(ans.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {isAnswerEdited && (
                              <span className="ml-1.5 text-slate-500 font-mono italic">(edited)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Answer Body: Edit Mode OR View Mode */}
                      {editingAnswerId === ans.id ? (
                        <div className="space-y-2 mb-4 p-3 bg-black/30 border border-indigo-500/30 rounded-xl">
                          <textarea
                            value={editingAnswerBody}
                            onChange={(e) => setEditingAnswerBody(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-[#121124] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed resize-y font-mono"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingAnswerId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateAnswer(ans.id)}
                              disabled={isSavingAnswer || !editingAnswerBody.trim()}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                            >
                              {isSavingAnswer && <Loader2 className="w-3 h-3 animate-spin" />}
                              Save Answer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mb-4 font-normal">
                          {ans.body}
                        </div>
                      )}

                      {/* Answer Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          {/* Professional Upvote & Downvote Pill for Answer */}
                          <div className="flex items-center bg-[#131224] border border-white/10 hover:border-indigo-500/30 rounded-xl p-0.5 shadow-inner transition-colors">
                            <button
                              onClick={() => handleVote('Answer', ans.id, 'Up')}
                              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                                ans.currentUserReaction === 'Up'
                                  ? 'text-emerald-400 bg-emerald-500/20 shadow-sm shadow-emerald-500/30'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
                              }`}
                              title="Upvote Answer"
                            >
                              <ArrowBigUp className={`w-3.5 h-3.5 transition-transform active:scale-125 ${ans.currentUserReaction === 'Up' ? 'fill-current' : ''}`} />
                            </button>
                            <span className={`px-1.5 text-[11px] font-extrabold font-mono tracking-tight ${
                              ans.currentUserReaction === 'Up'
                                ? 'text-emerald-400'
                                : ans.currentUserReaction === 'Down'
                                ? 'text-rose-400'
                                : (ans.score || 0) > 0
                                ? 'text-emerald-300'
                                : (ans.score || 0) < 0
                                ? 'text-rose-400'
                                : 'text-slate-300'
                            }`}>
                              {ans.score || 0}
                            </span>
                            <button
                              onClick={() => handleVote('Answer', ans.id, 'Down')}
                              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                                ans.currentUserReaction === 'Down'
                                  ? 'text-rose-400 bg-rose-500/20 shadow-sm shadow-rose-500/30'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-white/10'
                              }`}
                              title="Downvote Answer"
                            >
                              <ArrowBigDown className={`w-3.5 h-3.5 transition-transform active:scale-125 ${ans.currentUserReaction === 'Down' ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* LinkedIn Reactions */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (ans.currentUserReaction && ans.currentUserReaction !== 'Up' && ans.currentUserReaction !== 'Down') {
                                  handleRetractVote('Answer', ans.id);
                                } else {
                                  setActiveReactionTarget(
                                    activeReactionTarget?.id === ans.id ? null : { type: 'Answer', id: ans.id }
                                  );
                                }
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                ans.currentUserReaction && ans.currentUserReaction !== 'Up' && ans.currentUserReaction !== 'Down'
                                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                              }`}
                            >
                              <span>
                                {ans.currentUserReaction &&
                                  REACTION_OPTIONS.find((r) => r.value === ans.currentUserReaction)?.emoji || '👍'}
                              </span>
                              <span>React</span>
                            </button>

                            {activeReactionTarget?.id === ans.id && (
                              <div className="absolute left-0 bottom-10 z-40">
                                <ReactionPicker
                                  currentReaction={ans.currentUserReaction}
                                  onSelectReaction={(val) => {
                                    setActiveReactionTarget(null);
                                    handleVote('Answer', ans.id, val);
                                  }}
                                  onRetractReaction={() => {
                                    setActiveReactionTarget(null);
                                    handleRetractVote('Answer', ans.id);
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {(ans.reactions?.totalReactions || 0) > 0 && (
                            <button
                              onClick={() => onOpenReactors?.('Answer', ans.id)}
                              className="text-xs text-slate-400 hover:text-indigo-300"
                            >
                              {ans.reactions?.totalReactions} reactions
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setActiveCommentTarget(
                                activeCommentTarget?.id === ans.id ? null : { type: 'Answer', id: ans.id }
                              )
                            }
                            className="text-xs font-semibold text-slate-400 hover:text-white"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => onReport?.('Answer', ans.id)}
                            className="p-1 text-slate-500 hover:text-amber-400"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-Comments on Answer */}
                      {ans.comments && ans.comments.length > 0 && (
                        <div className="pt-2 border-t border-white/5 space-y-2 pl-4 mt-2">
                          {ans.comments.map((c) => {
                            const canModifySubComment = currentUserId === c.authorId || userRole === 'Admin';
                            const isSubCommentEdited = c.updatedAt && c.createdAt && new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime() + 1000;

                            return (
                              <div key={c.id} className="text-xs text-slate-300 bg-black/25 p-2 rounded-lg space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-indigo-300 shrink-0">
                                      {c.author?.fullName || 'Scholar'}:
                                    </span>
                                    {isSubCommentEdited && (
                                      <span className="text-[9px] text-slate-500 italic">(edited)</span>
                                    )}
                                  </div>

                                  {canModifySubComment && editingCommentId !== c.id && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(c.id);
                                          setEditingCommentBody(c.body);
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-indigo-300 transition-colors"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(c.id)}
                                        className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {editingCommentId === c.id ? (
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      type="text"
                                      value={editingCommentBody}
                                      onChange={(e) => setEditingCommentBody(e.target.value)}
                                      className="flex-1 px-2 py-0.5 bg-[#121124] border border-indigo-500/40 rounded text-xs text-white focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleUpdateComment(c.id)}
                                      disabled={isSavingComment || !editingCommentBody.trim()}
                                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-slate-200 leading-relaxed">{c.body}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}


                      {/* Answer Comment Input */}
                      {activeCommentTarget?.id === ans.id && (
                        <div className="flex items-center gap-2 pt-2 animate-in fade-in">
                          <input
                            type="text"
                            value={newCommentBody}
                            onChange={(e) => setNewCommentBody(e.target.value)}
                            placeholder="Add clarification or rebuttal..."
                            className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment('Answer', ans.id);
                            }}
                          />
                          <button
                            onClick={() => handleAddComment('Answer', ans.id)}
                            disabled={isSubmittingComment || !newCommentBody.trim()}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Answer Composer */}
              {!post.isLocked ? (
                <form onSubmit={handleSubmitAnswer} className="p-5 bg-[#0F0E20] border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Provide Your Scientific Solution
                  </h4>

                  <textarea
                    value={newAnswerBody}
                    onChange={(e) => setNewAnswerBody(e.target.value)}
                    placeholder="Provide a peer-reviewed solution, formula derivation, or empirical finding. Markdown is supported..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono leading-relaxed resize-none"
                    required
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Earn +15 reputation if accepted as solution, +20 if expert verified.
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmittingAnswer || newAnswerBody.trim().length < 5}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                      {isSubmittingAnswer ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Post Solution</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-center font-semibold">
                  🔒 This discussion has been locked by a moderator and cannot receive new answers.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">Discussion not found.</div>
          )}
        </div>
      </div>

      {/* In-System Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type || ''}`}
        message={
          deleteTarget?.type === 'Answer'
            ? 'Are you sure you want to delete this answer? This action cannot be undone and any comments on it will also be deleted.'
            : 'Are you sure you want to delete this comment? This action cannot be undone.'
        }
        confirmText={`Delete ${deleteTarget?.type || ''}`}
        isDeleting={isDeleting}
      />
    </div>
  );
};
