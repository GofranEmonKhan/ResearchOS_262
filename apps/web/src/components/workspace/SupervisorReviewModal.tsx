import React, { useState } from 'react';
import { Task } from '@researchos/shared-types';
import { X, CheckCircle2, RotateCcw, AlertTriangle, Award } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar.js';

export interface SupervisorReviewModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (taskId: string) => Promise<void>;
  onRequestRevision: (taskId: string, note: string) => Promise<void>;
}

export const SupervisorReviewModal: React.FC<SupervisorReviewModalProps> = ({
  task,
  isOpen,
  onClose,
  onApprove,
  onRequestRevision,
}) => {
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      setError('A revision note is required to explain what needs to be changed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onRequestRevision(task.id, revisionNote.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to request revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F0E1A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/90 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Supervisor Review Workflow</h3>
              <p className="text-[11px] text-slate-400">Review task deliverables & assign feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Summary Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Submitted Task</span>
            <h4 className="text-sm font-bold text-white">{task.title}</h4>
            <div className="flex items-center space-x-2 pt-1 text-xs text-slate-400">
              <UserAvatar
                photoUrl={task.assignee?.photoUrl}
                name={task.assignee?.fullName}
                role={task.assignee?.role}
                size="xs"
              />
              <span>Assignee: <strong className="text-white">{task.assignee?.fullName || 'Researcher'}</strong></span>
            </div>
          </div>

          {/* Revision Form */}
          <form onSubmit={handleRequestRevision} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Revision Feedback & Instructions
            </label>
            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="e.g., Please re-run the benchmark with 5-fold cross validation and add loss plots."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !revisionNote.trim()}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Request Revision</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Deliverable</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
