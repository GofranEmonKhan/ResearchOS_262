import React, { useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Send,
  Filter,
  Check,
  X,
  Lock,
  User,
  Quote,
} from 'lucide-react';
import {
  ReviewComment,
  ReviewCommentSeverity,
  ReviewCommentStatus,
  ManuscriptSection,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface ReviewCommentDrawerProps {
  manuscriptId: string;
  comments: ReviewComment[];
  sections: ManuscriptSection[];
  activeSectionId?: string | null;
  isAuthor: boolean;
  isSupervisor: boolean;
  isReviewer: boolean;
  currentUserId?: string;
  onRefreshComments: () => Promise<void>;
  selectedTextSnippet?: string | null;
  onClearSnippet?: () => void;
}

export const ReviewCommentDrawer: React.FC<ReviewCommentDrawerProps> = ({
  manuscriptId,
  comments,
  sections,
  activeSectionId,
  isAuthor,
  isSupervisor,
  isReviewer,
  onRefreshComments,
  selectedTextSnippet,
  onClearSnippet,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // New Comment Form
  const [newCommentText, setNewCommentText] = useState('');
  const [newSeverity, setNewSeverity] = useState<ReviewCommentSeverity>('MajorScientific');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Fix Comment Dialog State
  const [fixingCommentId, setFixingCommentId] = useState<string | null>(null);
  const [fixNote, setFixNote] = useState('');
  const [submittingFix, setSubmittingFix] = useState(false);

  // Reopen Dialog State
  const [reopeningCommentId, setReopeningCommentId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);

  // Filter comments
  const filteredComments = comments.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && c.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityBadge = (severity: ReviewCommentSeverity) => {
    switch (severity) {
      case 'CriticalFlaw':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Critical Flaw
          </span>
        );
      case 'MajorScientific':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Major Scientific
          </span>
        );
      case 'MinorTechnical':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Minor Technical
          </span>
        );
      case 'StyleSuggestion':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">
            Style / Note
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReviewCommentStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Open
          </span>
        );
      case 'FixedByResearcher':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Fixed by Author
          </span>
        );
      case 'Resolved':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Resolved
          </span>
        );
      case 'Reopened':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Reopened
          </span>
        );
      default:
        return null;
    }
  };

  // Submit new review comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    setCommentError(null);
    try {
      await api.createReviewComment(manuscriptId, {
        sectionId: activeSectionId || undefined,
        commentText: newCommentText.trim(),
        severity: newSeverity,
        highlightedText: selectedTextSnippet?.trim() || undefined,
      });
      setNewCommentText('');
      onClearSnippet?.();
      await onRefreshComments();
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post review comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Researcher marks comment as Fixed
  const handleFixSubmit = async (commentId: string) => {
    if (!fixNote.trim()) {
      alert('A descriptive fix note is required to explain how the issue was addressed.');
      return;
    }

    setSubmittingFix(true);
    try {
      await api.fixReviewComment(manuscriptId, commentId, { fixNote: fixNote.trim() });
      setFixingCommentId(null);
      setFixNote('');
      await onRefreshComments();
    } catch (err: any) {
      alert(err.message || 'Failed to update comment status');
    } finally {
      setSubmittingFix(false);
    }
  };

  // Supervisor resolves comment
  const handleResolve = async (commentId: string) => {
    try {
      await api.resolveReviewComment(manuscriptId, commentId);
      await onRefreshComments();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve comment');
    }
  };

  // Supervisor reopens comment
  const handleReopenSubmit = async (commentId: string) => {
    if (!reopenReason.trim()) {
      alert('Please specify the reason why this issue is being reopened.');
      return;
    }

    setSubmittingReopen(true);
    try {
      await api.reopenReviewComment(manuscriptId, commentId, { reopenReason: reopenReason.trim() });
      setReopeningCommentId(null);
      setReopenReason('');
      await onRefreshComments();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen comment');
    } finally {
      setSubmittingReopen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090D16] text-slate-100 select-none overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Peer Review Comments ({comments.length})
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {['ALL', 'Open', 'FixedByResearcher', 'Resolved', 'Reopened'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filterStatus === st
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'FixedByResearcher' ? 'Fixed' : st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 flex items-center gap-1 mr-1">
            <AlertTriangle className="w-3 h-3" />
            Severity:
          </span>
          {['ALL', 'CriticalFlaw', 'MajorScientific', 'MinorTechnical', 'StyleSuggestion'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filterSeverity === sev
                  ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev === 'ALL' ? 'All' : sev.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium text-slate-400">No review comments found</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
              {isReviewer || isSupervisor
                ? 'Highlight manuscript text or use the form below to leave scientific review feedback'
                : 'Comments submitted by internal reviewers will appear here'}
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const section = sections.find((s) => s.id === comment.sectionId);
            const isFixing = fixingCommentId === comment.id;
            const isReopening = reopeningCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3 transition-colors hover:border-slate-700/80"
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(comment.severity)}
                    {getStatusBadge(comment.status)}
                    {section && (
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                        § {section.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quoted Text Snippet if present */}
                {comment.highlightedText && (
                  <div className="p-2 rounded-lg bg-amber-500/5 border-l-2 border-amber-500 text-xs text-slate-300 italic flex items-start gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">"{comment.highlightedText}"</span>
                  </div>
                )}

                {/* Comment Body */}
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {comment.commentText}
                </p>

                {/* Reviewer / Meta */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">
                      {comment.reviewer?.fullName || 'Internal Reviewer'}
                    </span>
                  </div>
                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Fix Note Display (If Author Fixed) */}
                {comment.fixNote && (
                  <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      Author Fix Justification
                    </span>
                    <p className="italic leading-normal">"{comment.fixNote}"</p>
                  </div>
                )}

                {/* Action Controls based on Role & State */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Researcher "Mark as Fixed" */}
                  {isAuthor && comment.status === 'Open' && !isFixing && (
                    <button
                      onClick={() => {
                        setFixingCommentId(comment.id);
                        setFixNote('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark as Fixed (Add Note)</span>
                    </button>
                  )}

                  {/* Supervisor "Resolve" */}
                  {isSupervisor && (comment.status === 'Open' || comment.status === 'FixedByResearcher') && (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verify & Resolve</span>
                    </button>
                  )}

                  {/* Supervisor "Reopen" */}
                  {isSupervisor && comment.status === 'Resolved' && !isReopening && (
                    <button
                      onClick={() => {
                        setReopeningCommentId(comment.id);
                        setReopenReason('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reopen Issue</span>
                    </button>
                  )}
                </div>

                {/* Inline Fix Note Form */}
                {isFixing && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-blue-500/30 space-y-2 mt-2">
                    <label className="text-[11px] font-semibold text-blue-300 block">
                      Explain How You Addressed This Comment (Mandatory)
                    </label>
                    <textarea
                      value={fixNote}
                      onChange={(e) => setFixNote(e.target.value)}
                      placeholder="e.g. Added clarification to Methods section paragraph 3 and referenced equation 4."
                      rows={2}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setFixingCommentId(null)}
                        className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFixSubmit(comment.id)}
                        disabled={submittingFix || !fixNote.trim()}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[11px] font-semibold text-white transition-colors"
                      >
                        {submittingFix ? 'Submitting...' : 'Confirm Fix'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Reopen Form */}
                {isReopening && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30 space-y-2 mt-2">
                    <label className="text-[11px] font-semibold text-rose-300 block">
                      Reason for Reopening Issue
                    </label>
                    <textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="e.g. Clarification was insufficient; error in baseline table still persists."
                      rows={2}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setReopeningCommentId(null)}
                        className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReopenSubmit(comment.id)}
                        disabled={submittingReopen || !reopenReason.trim()}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-[11px] font-semibold text-white transition-colors"
                      >
                        {submittingReopen ? 'Reopening...' : 'Confirm Reopen'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Comment Submission Footer (For Reviewers & Supervisors) */}
      {(isReviewer || isSupervisor || isAuthor) && (
        <form onSubmit={handleAddComment} className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Add Review Comment
            </span>
            <div className="flex items-center gap-2">
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as ReviewCommentSeverity)}
                className="text-[11px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="CriticalFlaw">Critical Flaw (Blocks)</option>
                <option value="MajorScientific">Major Scientific (Blocks)</option>
                <option value="MinorTechnical">Minor Technical</option>
                <option value="StyleSuggestion">Style / Suggestion</option>
              </select>
            </div>
          </div>

          {/* Highlighted text preview tag */}
          {selectedTextSnippet && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
              <span className="truncate italic">Anchor: "{selectedTextSnippet}"</span>
              <button
                type="button"
                onClick={onClearSnippet}
                className="text-amber-400 hover:text-white p-0.5 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Enter constructive peer review remarks, experimental critiques, or citations..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {commentError && (
            <p className="text-[11px] text-rose-400">{commentError}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {activeSectionId ? 'Anchoring to active section' : 'General manuscript review'}
            </span>
            <button
              type="submit"
              disabled={submittingComment || !newCommentText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-white shadow-md shadow-amber-600/20 transition-all"
            >
              <Send className="w-3 h-3" />
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
