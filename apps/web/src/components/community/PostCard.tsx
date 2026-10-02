import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Eye,
  Pin,
  Lock,
  GraduationCap,
  Sparkles,
  ArrowBigUp,
  ArrowBigDown,
  MoreVertical,
  Flag,
  Share2,
  Trash2,
  Edit3,
  Check,
  Maximize2,
  Loader2,
  Copy,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { ForumPost, ForumVoteValue } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { ReactionPicker, REACTION_OPTIONS } from './ReactionPicker.js';
import { InlineDiscussionTray } from './InlineDiscussionTray.js';
import { ConfirmDeleteDialog } from '../common/ConfirmDeleteDialog.js';
import { getAuthToken } from '../../lib/api.js';

interface PostCardProps {
  post: ForumPost;
  currentUserId?: string;
  userRole?: string;
  isAdmin?: boolean;
  isFacultyVerified?: boolean;
  onOpenDetail: (postId: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectAuthor?: (authorId: string) => void;
  onVote: (postId: string, value: ForumVoteValue) => void;
  onRetractVote: (postId: string) => void;
  onOpenReactors: (postId: string) => void;
  onReport: (postId: string) => void;
  onEdit?: (post: ForumPost) => void;
  onDelete?: (postId: string) => void;
  onAnswerCountChange?: (postId: string, newCount: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  userRole,
  isAdmin,
  isFacultyVerified,
  onOpenDetail,
  onSelectTag,
  onSelectAuthor,
  onVote,
  onRetractVote,
  onOpenReactors,
  onReport,
  onEdit,
  onDelete,
  onAnswerCountChange,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isInlineTrayOpen, setIsInlineTrayOpen] = useState(false);
  const [localAnswerCount, setLocalAnswerCount] = useState(post.answersCount || 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  // Close options menu when clicking outside
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsMenu]);

  // Post inline editing state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editTags, setEditTags] = useState((post.tags || []).join(', '));
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Share feedback toast
  const [copiedToast, setCopiedToast] = useState(false);

  const isAuthor = currentUserId === post.authorId;
  const canModify = isAuthor || isAdmin;
  const isScientificBlog = post.tags?.includes('scientific-blog') || post.tags?.includes('blog') || (post as any).postType === 'blog';

  // Extract cover image if embedded in markdown
  const coverImageMatch = post.body.match(/!\[(.*?)\]\((.*?)\)/);
  const coverImageUrl = coverImageMatch ? coverImageMatch[2] : null;
  const coverImageAlt = coverImageMatch ? coverImageMatch[1] : '';

  // Clean prose preview text for cards (stripping attached image markdown)
  const cleanPreviewText = post.body
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .trim();

  const reactions = post.reactions || {
    like: 0,
    love: 0,
    insightful: 0,
    celebrate: 0,
    curious: 0,
    support: 0,
    up: 0,
    down: 0,
    totalReactions: 0,
  };

  // Top reaction emojis
  const activeReactions = REACTION_OPTIONS.filter((opt) => {
    const key = opt.value.toLowerCase() as keyof typeof reactions;
    return (reactions[key] as number) > 0;
  });

  const handleVoteClick = (e: React.MouseEvent, type: 'Up' | 'Down') => {
    e.stopPropagation();
    if (post.currentUserReaction === type) {
      onRetractVote(post.id);
    } else {
      onVote(post.id, type);
    }
  };

  const handleReactionSelect = (val: ForumVoteValue) => {
    setShowReactionPicker(false);
    if (post.currentUserReaction === val) {
      onRetractVote(post.id);
    } else {
      onVote(post.id, val);
    }
  };

  const handleCopyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/community?post=${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleSavePostEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim() || !editBody.trim()) {
      setEditError('Title and body are required.');
      return;
    }

    setIsSavingPost(true);
    setEditError(null);

    const parsedTags = editTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          tags: parsedTags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update post');
      }

      const updated = await res.json();
      setIsEditingPost(false);
      onEdit?.(updated);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update post');
    } finally {
      setIsSavingPost(false);
    }
  };

  const isPostEdited = post.updatedAt && post.createdAt && new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 1000;

  return (
    <div
      className={`group relative p-5 bg-[#0C0B18]/85 hover:bg-[#100F22] border rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-indigo-950/30 ${
        post.isPinned
          ? 'border-indigo-500/40 bg-indigo-950/15 ring-1 ring-indigo-500/20'
          : 'border-white/10 hover:border-indigo-500/30'
      }`}
    >
      {/* In-system Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        title="Delete Discussion Post"
        message="Are you sure you want to permanently delete this discussion post? All answers, comments, and votes will also be deleted."
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.(post.id);
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />

      {/* Toast Notification for Copied Link */}
      {copiedToast && (
        <div className="absolute top-4 right-14 z-40 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl shadow-xl animate-in fade-in zoom-in-95">
          <Copy className="w-3.5 h-3.5" />
          <span>Permalink copied!</span>
        </div>
      )}

      {/* Pinned, Solved & Scientific Blog Badge Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scientific Blog Badge */}
          {isScientificBlog && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Scientific Blog
            </span>
          )}

          {post.isPinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Pin className="w-3 h-3 rotate-45" />
              Pinned
            </span>
          )}

          {post.isLocked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}

          {post.hasAcceptedAnswer && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Solved
            </span>
          )}

          {post.projectName && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-400 border border-white/10">
              📁 {post.projectName}
            </span>
          )}
        </div>

        {/* Options & Deep Modal Quick Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Deep Focus / Full Modal View Icon */}
          <button
            onClick={() => onOpenDetail(post.id)}
            title="Open Deep Focus Modal View"
            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative" ref={optionsMenuRef}>
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className={`p-1.5 rounded-lg transition-colors ${
                showOptionsMenu
                  ? 'text-white bg-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-8 z-30 w-48 py-1.5 bg-[#121124] border border-white/15 rounded-xl shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={(e) => {
                    setShowOptionsMenu(false);
                    handleCopyShareLink(e);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy Permalink</span>
                </button>

                {canModify && onEdit && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setIsEditingPost(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit Post</span>
                  </button>
                )}

                {canModify && onDelete && (
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    onReport(post.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors text-left border-t border-white/10 mt-1 pt-2"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Report Content</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Author Bar */}
      <div className="flex items-center gap-3 mb-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (post.authorId) onSelectAuthor?.(post.authorId);
          }}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer"
        >
          <UserAvatar
            name={post.author?.fullName || 'Scholar'}
            photoUrl={post.author?.photoUrl}
            size="sm"
          />

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-200 hover:text-indigo-300 transition-colors">
                {post.author?.fullName || 'Anonymous Scholar'}
              </span>

              {post.author?.isFacultyVerified && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <GraduationCap className="w-3 h-3" />
                  Faculty
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                {post.author?.reputationPoints || 0}
              </span>

              {isScientificBlog && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                  Scientific Blog
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              {post.author?.institution || 'Research Institute'} •{' '}
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
              {isPostEdited && (
                <span className="ml-1.5 text-slate-500 font-mono italic">(edited)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Post Content: Either Inline Edit Mode OR Regular Display */}
      {isEditingPost ? (
        <div className="p-4 bg-black/40 border border-indigo-500/30 rounded-xl space-y-3 mb-4 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Discussion Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#121124] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Body & Methodology Context</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-[#121124] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Tags (comma-separated)</label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="genomics, transformer, crispr"
              className="w-full px-3 py-2 bg-[#121124] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {editError && (
            <p className="text-xs font-semibold text-rose-400">{editError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setIsEditingPost(false);
                setEditTitle(post.title);
                setEditBody(post.body);
                setEditTags((post.tags || []).join(', '));
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePostEdit}
              disabled={isSavingPost}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSavingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Post Title & Body Preview */}
          <h3
            onClick={() => setIsInlineTrayOpen(!isInlineTrayOpen)}
            className="text-base sm:text-lg font-bold text-white hover:text-indigo-300 transition-colors mb-1.5 line-clamp-2 leading-snug cursor-pointer"
          >
            {post.title}
          </h3>

          <p
            onClick={() => setIsInlineTrayOpen(!isInlineTrayOpen)}
            className="text-sm text-slate-300/80 line-clamp-3 mb-3 leading-relaxed cursor-pointer"
          >
            {cleanPreviewText || post.body}
          </p>

          {/* Attached Image / Screenshot / Diagram Preview if present */}
          {coverImageUrl && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(post.id);
              }}
              className="relative w-full h-44 sm:h-52 mb-3.5 rounded-xl overflow-hidden border border-white/10 group/img cursor-pointer bg-black/40 shadow-md"
            >
              <img
                src={coverImageUrl}
                alt={coverImageAlt || 'Attached Image or Screenshot'}
                className="w-full h-full object-cover object-center group-hover/img:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-black/75 text-slate-300 border border-white/10 backdrop-blur-sm flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-indigo-400" />
                <span>{coverImageAlt || 'Attached Image'}</span>
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag?.(tag);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/20 transition-all hover:scale-105"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* LinkedIn Action Bar (Vote, React, Comment/Answer, Share) */}
      <div
        className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Voting & Reaction triggers */}
        <div className="flex items-center gap-2">
          {/* Professional Upvote & Downvote Pill */}
          <div className="flex items-center bg-[#131224] border border-white/10 hover:border-indigo-500/30 rounded-xl p-0.5 shadow-inner transition-colors">
            <button
              onClick={(e) => handleVoteClick(e, 'Up')}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                post.currentUserVote === 'Up'
                  ? 'text-emerald-400 bg-emerald-500/20 shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
              }`}
              title="Upvote"
            >
              <ArrowBigUp className={`w-4 h-4 transition-transform active:scale-125 ${post.currentUserVote === 'Up' ? 'fill-current' : ''}`} />
            </button>

            <span className={`px-2 text-xs font-extrabold font-mono tracking-tight ${
              post.currentUserVote === 'Up'
                ? 'text-emerald-400'
                : post.currentUserVote === 'Down'
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
              onClick={(e) => handleVoteClick(e, 'Down')}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                post.currentUserVote === 'Down'
                  ? 'text-rose-400 bg-rose-500/20 shadow-sm shadow-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-white/10'
              }`}
              title="Downvote"
            >
              <ArrowBigDown className={`w-4 h-4 transition-transform active:scale-125 ${post.currentUserVote === 'Down' ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* LinkedIn Reaction Picker Relative Anchor */}
          <div className="relative">
            <button
              onClick={() => {
                // If user clicks directly on an already active reaction, toggle/retract it
                if (post.currentUserReaction && post.currentUserReaction !== 'Up' && post.currentUserReaction !== 'Down') {
                  onRetractVote(post.id);
                } else {
                  setShowReactionPicker(!showReactionPicker);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                post.currentUserReaction && post.currentUserReaction !== 'Up' && post.currentUserReaction !== 'Down'
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <span>
                {post.currentUserReaction &&
                  REACTION_OPTIONS.find((r) => r.value === post.currentUserReaction)?.emoji || '👍'}
              </span>
              <span className="font-semibold text-xs">
                {post.currentUserReaction &&
                  REACTION_OPTIONS.find((r) => r.value === post.currentUserReaction)?.label || 'React'}
              </span>
            </button>

            {showReactionPicker && (
              <div className="absolute left-0 bottom-10 z-40">
                <ReactionPicker
                  currentReaction={post.currentUserReaction}
                  onSelectReaction={handleReactionSelect}
                  onRetractReaction={() => {
                    setShowReactionPicker(false);
                    onRetractVote(post.id);
                  }}
                />
              </div>
            )}
          </div>

          {/* Aggregated Reaction preview badge */}
          {reactions.totalReactions > 0 && (
            <button
              onClick={() => onOpenReactors(post.id)}
              className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-slate-300 border border-white/5 transition-colors"
            >
              <div className="flex -space-x-1">
                {activeReactions.slice(0, 3).map((r) => (
                  <span key={r.value} className="text-xs">
                    {r.emoji}
                  </span>
                ))}
              </div>
              <span className="text-[11px] ml-0.5">{reactions.totalReactions}</span>
            </button>
          )}
        </div>

        {/* Right: LinkedIn-style Inline Comment/Answer Toggle & Share */}
        <div className="flex items-center gap-2 sm:gap-3 text-slate-400">
          {/* Share Button */}
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Share permalink"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-medium">Share</span>
          </button>

          {/* Inline Tray Accordion Toggle Button */}
          <button
            onClick={() => setIsInlineTrayOpen(!isInlineTrayOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              isInlineTrayOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 font-bold'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className={post.hasAcceptedAnswer ? 'text-emerald-300 font-semibold' : ''}>
              {localAnswerCount} {localAnswerCount === 1 ? 'Answer' : 'Answers'}
            </span>
          </button>

          {/* View Count */}
          <div className="hidden sm:flex items-center gap-1 text-slate-500 pl-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.viewsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Accordion: Inline LinkedIn-Style Discussion Tray */}
      {isInlineTrayOpen && (
        <div
          className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <InlineDiscussionTray
            postId={post.id}
            currentUserId={currentUserId}
            userRole={userRole}
            isPostAuthor={isAuthor}
            isFacultyVerified={isFacultyVerified}
            onAnswerCountChange={(cnt) => {
              setLocalAnswerCount(cnt);
              onAnswerCountChange?.(post.id, cnt);
            }}
            onSelectAuthor={onSelectAuthor}
            onOpenReactors={(_type, id) => onOpenReactors(id)}
            onReport={(_type, id) => onReport(id)}
          />
        </div>
      )}

      {/* In-System Confirm Delete Post Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          onDelete?.(post.id);
        }}
        title="Delete Discussion Post"
        message="Are you sure you want to delete this post? All answers, comments, and votes will be permanently removed."
        confirmText="Delete Post"
      />
    </div>
  );
};

