import React, { useState } from 'react';
import {
  UserCheck,
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { HoverSelect } from '../common/HoverSelect.js';

interface AssignReviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  projectMembers: {
    userId: string;
    fullName?: string;
    email?: string;
    role?: string;
  }[];
  onReviewerAssigned: () => Promise<void>;
}

export const AssignReviewerModal: React.FC<AssignReviewerModalProps> = ({
  isOpen,
  onClose,
  manuscriptId,
  projectMembers,
  onReviewerAssigned,
}) => {
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewerId) {
      setError('Please select a project member to assign as reviewer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.assignReviewer(manuscriptId, {
        reviewerId: selectedReviewerId,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      await onReviewerAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign reviewer');
    } finally {
      setSubmitting(false);
    }
  };

  const memberOptions = projectMembers.map((m) => ({
    value: m.userId,
    label: `${m.fullName || m.email || m.userId} (${m.role || 'Member'})`,
    badge: m.role || 'Member',
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#0C101A] border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-reviewer-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="assign-reviewer-title" className="text-lg font-bold text-white tracking-tight">
                Assign Internal Reviewer
              </h2>
              <p className="text-xs text-slate-300">
                Designate a peer reviewer with commenting rights (Supervisor Only)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Select Team Member</span> <span className="text-rose-400">*</span>
            </label>
            <HoverSelect
              value={selectedReviewerId}
              onChange={setSelectedReviewerId}
              placeholder="-- Choose Reviewer from Project Members --"
              className="w-full"
              buttonClassName="w-full justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 border-slate-700 text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              options={memberOptions}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Review Deadline (Optional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedReviewerId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Assign Reviewer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
