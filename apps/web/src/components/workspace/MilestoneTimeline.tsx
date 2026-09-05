import React from 'react';
import { Milestone, Task, Project } from '@researchos/shared-types';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Sparkles,
  Check,
} from 'lucide-react';

export interface MilestoneTimelineProps {
  milestones: Milestone[];
  tasks: Task[];
  project: Project;
  currentUserId?: string;
  currentUserRole?: string;
  onLockToggle?: (milestoneId: string, currentLocked: boolean) => Promise<void>;
  onApproveProposal?: (milestoneId: string) => Promise<void>;
  onOpenNewMilestone?: () => void;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones = [],
  tasks = [],
  project,
  currentUserId,
  currentUserRole,
  onLockToggle,
  onApproveProposal,
  onOpenNewMilestone,
}) => {
  const isSupervisor = currentUserRole === 'Supervisor' || project.ownerId === currentUserId;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#0D0C18]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            <span>Research Milestones & Deliverables Roadmap</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential phases weighting towards 100% project completion
          </p>
        </div>

        <button
          onClick={onOpenNewMilestone}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSupervisor ? 'Add Milestone' : 'Propose Milestone'}</span>
        </button>
      </div>

      {/* Milestone Cards / Timeline */}
      <div className="space-y-3">
        {milestones.length === 0 ? (
          <div className="py-12 text-center bg-[#0D0C18]/40 border border-dashed border-white/10 rounded-2xl">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-xs text-slate-400 font-medium">No milestones defined yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Create your first milestone to track progress.</p>
          </div>
        ) : (
          milestones.map((m, index) => {
            const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
            const approvedTasks = milestoneTasks.filter((t) => t.status === 'Approved');
            const progressPercent =
              milestoneTasks.length > 0
                ? Math.round((approvedTasks.length / milestoneTasks.length) * 100)
                : 0;

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl bg-[#0D0C18]/90 border transition-all ${
                  m.isProposed
                    ? 'border-dashed border-amber-500/30 bg-amber-950/5'
                    : m.isLocked
                    ? 'border-amber-500/20 shadow-lg shadow-amber-950/20'
                    : 'border-white/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{m.name}</h4>
                        {m.isProposed && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> Proposed
                          </span>
                        )}
                        {m.isLocked && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Weight */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Contribution</span>
                      <span className="text-xs font-bold text-violet-300">{m.weightPct}% weight</span>
                    </div>

                    {/* Lock Toggle Button (Supervisor only) */}
                    {isSupervisor && !m.isProposed && onLockToggle && (
                      <button
                        onClick={() => onLockToggle(m.id, m.isLocked)}
                        className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                          m.isLocked
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                        title={m.isLocked ? 'Unlock Milestone' : 'Lock Milestone (prevents editing tasks)'}
                      >
                        {m.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Approve Proposal Button */}
                    {m.isProposed && isSupervisor && onApproveProposal && (
                      <button
                        onClick={() => onApproveProposal(m.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Subtask Stats */}
                <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2 flex-1 max-w-md">
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">{progressPercent}%</span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span>
                      Tasks: <strong className="text-white">{approvedTasks.length}</strong> / {milestoneTasks.length} approved
                    </span>
                    {m.targetDate && (
                      <span>
                        Target: <strong className="text-slate-200">{new Date(m.targetDate).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
