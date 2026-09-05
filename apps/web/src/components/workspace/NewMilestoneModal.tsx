import React, { useState } from 'react';
import { Project } from '@researchos/shared-types';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase.js';

export interface NewMilestoneModalProps {
  project?: Project | null;
  currentUserId?: string;
  currentUserRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onMilestoneCreated: () => Promise<void>;
}

export const NewMilestoneModal: React.FC<NewMilestoneModalProps> = ({
  project,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onMilestoneCreated,
}) => {
  const [title, setTitle] = useState('');
  const [weightPercent, setWeightPercent] = useState('20');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupervisor = currentUserRole === 'Supervisor' || project?.ownerId === currentUserId;
  const isPersonal = project?.isPersonal;
  const isDirectCreation = isSupervisor || isPersonal;

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Milestone title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: title.trim(),
          weightPct: parseInt(weightPercent, 10) || 10,
          targetDate: targetDate || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create milestone');
      }

      await onMilestoneCreated();
      onClose();
      setTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to create milestone');
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
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isDirectCreation ? 'Create Project Milestone' : 'Propose Project Milestone'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isDirectCreation
                  ? 'Define progress phase with completion weight'
                  : 'Submit milestone proposal for supervisor review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Milestone Name *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Phase 1: Benchmark Baseline Models"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Weight %</label>
              <input
                type="number"
                min="1"
                max="100"
                value={weightPercent}
                onChange={(e) => setWeightPercent(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : isDirectCreation
                ? 'Create Milestone'
                : 'Submit Milestone Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
