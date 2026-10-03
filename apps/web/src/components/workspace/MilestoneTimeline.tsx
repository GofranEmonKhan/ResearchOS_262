import React from 'react';
import { Milestone, Task, Project } from '@researchos/shared-types';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Sparkles,
  Check,
  CheckCircle2,
  Clock,
  CheckCheck,
  TrendingUp,
  Flame,
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

  // Compute total project progress from approved tasks / milestones
  const computedProjectProgress = project.progressPct !== undefined
    ? project.progressPct
    : (() => {
        if (milestones.length === 0) return 0;
        let weightedSum = 0;
        let totalWeight = 0;
        milestones.forEach((m) => {
          const mTasks = tasks.filter((t) => t.milestoneId === m.id);
          const approved = mTasks.filter((t) => t.status === 'Approved');
          const pct = mTasks.length > 0 ? approved.length / mTasks.length : 0;
          const weight = m.weightPct || 1;
          weightedSum += pct * weight;
          totalWeight += weight;
        });
        return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
      })();

  return (
    <div className="space-y-4">
      {/* Header Bar — Cosmic Glassmorphism Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-950/40 via-surface-1 to-indigo-950/40 p-5 sm:p-6 rounded-3xl border border-violet-500/20 shadow-xl backdrop-blur-md relative overflow-hidden">
        {/* Ambient Subtle Radial Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-60 h-60 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-violet-600/15 border border-violet-500/30 rounded-xl text-violet-400 shadow-sm shadow-violet-950/40">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Research Milestones & Deliverables Roadmap
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
              <TrendingUp className="w-3 h-3 text-violet-400" />
              Sequential Journey
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            Sequential phases weighting towards 100% project completion
          </p>
        </div>

        <div className="flex items-center gap-3.5 z-10 shrink-0 self-start sm:self-center">
          {/* Overall Progress Widget */}
          <div className="hidden md:flex flex-col items-end px-3.5 py-1.5 rounded-xl bg-surface-2/90 border border-white/10 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Overall Progress</span>
              <strong className="text-white font-mono">{computedProjectProgress}%</strong>
            </div>
            <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${computedProjectProgress}%` }}
              />
            </div>
          </div>

          <button
            onClick={onOpenNewMilestone}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSupervisor ? 'Add Milestone' : 'Propose Milestone'}</span>
          </button>
        </div>
      </div>

      {/* Milestone Cards / Timeline */}
      <div className="space-y-3.5">
        {milestones.length === 0 ? (
          <div className="py-14 text-center bg-surface-1/80 border border-dashed border-white/15 rounded-3xl space-y-3 p-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500 mx-auto">
              <Calendar className="w-6 h-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">No milestones defined yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first research milestone to track tasks, weights, and deadlines.
              </p>
            </div>
            <button
              onClick={onOpenNewMilestone}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
            >
              <span>{isSupervisor ? '+ Create First Milestone' : '+ Propose Milestone'}</span>
            </button>
          </div>
        ) : (
          milestones.map((m, index) => {
            const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
            const approvedTasks = milestoneTasks.filter((t) => t.status === 'Approved');
            const progressPercent =
              milestoneTasks.length > 0
                ? Math.round((approvedTasks.length / milestoneTasks.length) * 100)
                : 0;

            const isCompleted = progressPercent === 100 || m.status === 'Completed';
            const isInProgress = !isCompleted && (progressPercent > 0 || m.status === 'InProgress');

            return (
              <div
                key={m.id}
                className={`p-5 sm:p-6 rounded-2xl transition-all duration-200 shadow-md hover:shadow-xl group backdrop-blur-md ${
                  m.isProposed
                    ? 'border-dashed border-amber-500/40 bg-gradient-to-r from-amber-950/15 via-surface-1/90 to-surface-1/90'
                    : m.isLocked
                    ? 'border-amber-500/30 bg-surface-1/90 shadow-amber-950/20'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-surface-1/90 hover:border-emerald-500/50'
                    : isInProgress
                    ? 'border-violet-500/40 bg-surface-1/95 ring-1 ring-violet-500/20 hover:border-violet-500/60'
                    : 'border-white/10 bg-surface-1/90 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Phase Number Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 border shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                        isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-950/30'
                          : isInProgress
                          ? 'bg-violet-600/25 border-violet-500/40 text-violet-200 shadow-violet-950/40 ring-1 ring-violet-400/30'
                          : m.isLocked
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white group-hover:text-violet-200 transition-colors tracking-tight">
                          {m.name}
                        </h4>

                        {/* Status Pills */}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm">
                            <CheckCheck className="w-3 h-3" /> Completed
                          </span>
                        )}

                        {isInProgress && !m.isProposed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm">
                            <Flame className="w-3 h-3 text-violet-400" /> In Progress
                          </span>
                        )}

                        {m.isProposed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Proposed
                          </span>
                        )}

                        {m.isLocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm">
                            <Lock className="w-3 h-3 text-amber-400" /> Locked
                          </span>
                        )}
                      </div>

                      {m.description && (
                        <p className="text-xs sm:text-sm text-slate-300/90 font-normal leading-relaxed max-w-3xl">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Weight Pill */}
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="px-3 py-1.5 rounded-xl bg-surface-2/90 border border-white/10 text-right shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-tight">
                        Contribution
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-violet-300 font-mono">
                        {m.weightPct}% weight
                      </span>
                    </div>

                    {/* Lock Toggle Button (Supervisor only) */}
                    {isSupervisor && !m.isProposed && onLockToggle && (
                      <button
                        onClick={() => onLockToggle(m.id, m.isLocked)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
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
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Subtask Stats */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="flex-1 bg-white/[0.07] rounded-full h-2 overflow-hidden border border-white/[0.04]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : isInProgress
                            ? 'bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-200 min-w-[36px] text-right">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Tasks:</span>
                      <strong className="text-white font-mono">{approvedTasks.length}</strong>
                      <span className="text-slate-400">/ {milestoneTasks.length} approved</span>
                    </span>
                    {m.targetDate && (
                      <span className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target:</span>
                        <strong className="text-slate-200">
                          {new Date(m.targetDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
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
