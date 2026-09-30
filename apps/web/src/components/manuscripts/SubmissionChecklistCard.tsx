import React, { useState } from 'react';
import {
  CheckSquare,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Send,
  Award,
  Loader2,
  FileCheck,
} from 'lucide-react';
import {
  Manuscript,
  ManuscriptChecklistItem,
  ManuscriptStatus,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface SubmissionChecklistCardProps {
  manuscript: Manuscript;
  checklistItems: ManuscriptChecklistItem[];
  isAuthor: boolean;
  isSupervisor: boolean;
  unresolvedMajorCount: number;
  openCommentsCount: number;
  onRefreshManuscript: () => Promise<void>;
}

export const SubmissionChecklistCard: React.FC<SubmissionChecklistCardProps> = ({
  manuscript,
  checklistItems,
  isAuthor,
  isSupervisor,
  unresolvedMajorCount,
  openCommentsCount,
  onRefreshManuscript,
}) => {
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Toggle checklist item completion
  const handleToggleItem = async (item: ManuscriptChecklistItem) => {
    if (item.isLocked && !isSupervisor) {
      setTransitionError('This checklist requirement is locked by the project supervisor.');
      return;
    }

    setUpdatingItemId(item.id);
    setTransitionError(null);
    try {
      await api.updateChecklistItem(manuscript.id, item.id, {
        isCompleted: !item.isCompleted,
      });
      await onRefreshManuscript();
    } catch (err: any) {
      setTransitionError(err.message || 'Failed to update checklist item');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Status transitions based on state machine
  const handleTransitionStatus = async (nextStatus: ManuscriptStatus) => {
    setTransitioning(true);
    setTransitionError(null);
    try {
      await api.transitionManuscriptStatus(manuscript.id, { status: nextStatus });
      await onRefreshManuscript();
    } catch (err: any) {
      setTransitionError(err.message || `Failed to transition status to ${nextStatus}`);
    } finally {
      setTransitioning(false);
    }
  };

  const completedCount = checklistItems.filter((i) => i.isCompleted).length;
  const progressPercent =
    checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#090D16] text-slate-100 select-none overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Submission Governance
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-400">
            {completedCount}/{checklistItems.length} ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Blocker Alert Banner */}
      {unresolvedMajorCount > 0 ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Submission Approval Blocked</span>
          </div>
          <p className="text-[11px] text-rose-200/90 leading-relaxed">
            {unresolvedMajorCount} unresolved Critical or Major Scientific review flaw
            {unresolvedMajorCount > 1 ? 's' : ''} detected. ResearchOS governance prevents supervisor submission sign-off until all major flaws are resolved.
          </p>
        </div>
      ) : openCommentsCount > 0 ? (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{openCommentsCount} minor comment(s) currently open for discussion.</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>All scientific review comments are resolved.</span>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Verification Checklist
        </h4>

        {checklistItems.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No checklist items defined.</p>
        ) : (
          checklistItems.map((item) => {
            const isUpdating = updatingItemId === item.id;
            const canToggle = !item.isLocked || isSupervisor;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300'
                } ${canToggle ? 'cursor-pointer hover:border-slate-700' : 'opacity-80'}`}
                onClick={() => canToggle && handleToggleItem(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      disabled={!canToggle || isUpdating}
                      onChange={() => {}} // Handled by container onClick
                      className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <div>
                      <span className={`text-xs ${item.isCompleted ? 'line-through text-slate-400' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {item.completedByUser && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Verified by {item.completedByUser.fullName || 'Supervisor'}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.isLocked && (
                    <span
                      title="Locked by supervisor"
                      className="p-1 rounded bg-slate-800 text-slate-400 shrink-0"
                    >
                      <Lock className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lifecycle & Status Transition Actions */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Manuscript Status & Lifecycle
        </h4>

        {transitionError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {transitionError}
          </div>
        )}

        {/* State Machine Transition Actions */}
        <div className="space-y-2">
          {/* Draft -> UnderInternalReview */}
          {manuscript.status === 'Draft' && (isAuthor || isSupervisor) && (
            <button
              onClick={() => handleTransitionStatus('UnderInternalReview')}
              disabled={transitioning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
            >
              {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit for Internal Peer Review</span>
            </button>
          )}

          {/* UnderInternalReview -> ReadyForSubmission (Supervisor only) */}
          {(manuscript.status === 'UnderInternalReview' || manuscript.status === 'Revising') && isSupervisor && (
            <button
              onClick={() => handleTransitionStatus('ReadyForSubmission')}
              disabled={transitioning || unresolvedMajorCount > 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all"
            >
              {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              <span>Supervisor Approval: Mark as Ready</span>
            </button>
          )}

          {/* ReadyForSubmission -> Submitted */}
          {manuscript.status === 'ReadyForSubmission' && (isAuthor || isSupervisor) && (
            <button
              onClick={() => handleTransitionStatus('Submitted')}
              disabled={transitioning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Mark as Submitted to Journal</span>
            </button>
          )}

          {/* Submitted -> Published */}
          {manuscript.status === 'Submitted' && (isAuthor || isSupervisor) && (
            <button
              onClick={() => handleTransitionStatus('Published')}
              disabled={transitioning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-teal-600/20 transition-all"
            >
              {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              <span>Mark as Published in Venue</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
