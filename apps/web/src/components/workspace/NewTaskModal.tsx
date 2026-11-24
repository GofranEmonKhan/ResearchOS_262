import React, { useState } from 'react';
import { Project, Milestone, ProjectMember, TaskPriority } from '@researchos/shared-types';
import { X, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase.js';
import { HoverSelect } from '../common/HoverSelect.js';

export interface NewTaskModalProps {
  project?: Project | null;
  milestones: Milestone[];
  members: ProjectMember[];
  currentUserId?: string;
  currentUserRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => Promise<void>;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  project,
  milestones = [],
  members = [],
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId || '');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [estimatedHours, setEstimatedHours] = useState<string>('4');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupervisor = currentUserRole === 'Supervisor' || project?.ownerId === currentUserId;
  const isPersonal = project?.isPersonal;
  const isDirectCreation = isSupervisor || isPersonal;

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          milestoneId: milestoneId || undefined,
          assigneeId: assigneeId || undefined,
          priority,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          dueDate: dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      await onTaskCreated();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
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
              {isDirectCreation ? <Plus className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isDirectCreation ? 'Create Workspace Task' : 'Propose New Task'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isDirectCreation
                  ? 'Assign deliverable to research team'
                  : 'Submit task proposal for supervisor review'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Run Ablation Study on Attention Heads"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description & Scope</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific experimental parameters, dataset splits, or expected deliverables..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Milestone & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <HoverSelect
              label="Milestone"
              value={milestoneId}
              onChange={(val) => setMilestoneId(val)}
              options={[
                { value: '', label: 'No Milestone' },
                ...milestones
                  .filter((m) => !m.isLocked)
                  .map((m) => ({
                    value: m.id,
                    label: m.name,
                  })),
              ]}
              buttonClassName="py-2"
            />

            <HoverSelect
              label="Priority"
              value={priority}
              onChange={(val) => setPriority(val as TaskPriority)}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
              ]}
              buttonClassName="py-2"
            />
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <HoverSelect
              label="Assignee"
              value={assigneeId}
              onChange={(val) => setAssigneeId(val)}
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map((m) => ({
                  value: m.userId,
                  label: m.user?.fullName || m.userId,
                  badge: m.projectRole,
                })),
              ]}
              buttonClassName="py-2"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estimated Effort (Hours)</label>
            <input
              type="number"
              min="1"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 4"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? 'Processing...'
                : isDirectCreation
                ? 'Create Task'
                : 'Submit Task Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
