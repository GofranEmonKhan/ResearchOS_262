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
  Compass,
  ArrowRight,
  ArrowDown,
  Layers,
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

  // Calculate real overall progress dynamically
  const totalWeight = milestones.reduce((sum, m) => sum + (m.weightPct || 0), 0);
  const weightedProgress = milestones.reduce((acc, m) => {
    const mTasks = tasks.filter((t) => t.milestoneId === m.id);
    const approved = mTasks.filter((t) => t.status === 'Approved').length;
    const mProgress = mTasks.length > 0 ? approved / mTasks.length : m.status === 'Completed' ? 1 : 0;
    const weight = m.weightPct || 0;
    return acc + (mProgress * weight);
  }, 0);

  const overallProgress = totalWeight > 0
    ? Math.min(100, Math.round((weightedProgress / totalWeight) * 100))
    : project.progressPct || 0;

  return (
    <section className="space-y-6 select-none" aria-label="Research Journey Roadmap">
      {/* ─── HEADER OF MILESTONE SECTION ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-violet-950/40 via-surface-1 to-indigo-950/40 border border-violet-500/20 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle Ambient Radial Spotlight */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Title & Description */}
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-violet-600/15 border border-violet-500/30 rounded-xl text-violet-400 shadow-sm shadow-violet-950/40">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Research Journey</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
              <Layers className="w-3 h-3 text-amber-400" />
              {milestones.length} {milestones.length === 1 ? 'Phase' : 'Phases'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300/90 font-normal max-w-2xl leading-relaxed">
            From data to publication — key milestones, dependencies and progress.
          </p>
        </div>

        {/* Right Controls: Overall Progress + Add/Propose CTA */}
        <div className="flex items-center gap-4 z-10 flex-wrap sm:flex-nowrap">
          {/* Dynamic Overall Progress Meter */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface-2/90 border border-white/10 shadow-md">
            <div className="space-y-1 text-right min-w-[100px]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 gap-2">
                <span>Overall Progress</span>
                <span className="text-violet-300 font-bold font-mono">{overallProgress}%</span>
              </div>
              <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <button
            onClick={onOpenNewMilestone}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSupervisor ? 'Add Milestone' : 'Propose Milestone'}</span>
          </button>
        </div>
      </div>

      {/* ─── RESEARCH JOURNEY VISUALIZATION ─────────────────────────────────── */}
      {milestones.length === 0 ? (
        <div className="py-14 text-center bg-surface-1/60 border border-dashed border-white/15 rounded-3xl p-6 backdrop-blur-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto">
            <Calendar className="w-6 h-6 opacity-70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No research milestones defined yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Structure your investigation into sequential phases, contribution weights, and deadlines.
            </p>
          </div>
          <button
            onClick={onOpenNewMilestone}
            className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-violet-500/30 text-xs font-semibold text-white transition-all shadow-md"
          >
            + {isSupervisor ? 'Create First Milestone' : 'Propose First Milestone'}
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Grid Layout: Desktop Horizontal Journey (auto columns) | Tablet/Mobile Vertical Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
            {milestones.map((m, index) => {
              const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
              const approvedTasks = milestoneTasks.filter((t) => t.status === 'Approved');
              const isCompleted =
                m.status === 'Completed' ||
                (milestoneTasks.length > 0 && approvedTasks.length === milestoneTasks.length);
              
              const progressPercent = isCompleted
                ? 100
                : milestoneTasks.length > 0
                ? Math.round((approvedTasks.length / milestoneTasks.length) * 100)
                : 0;

              const isCurrent =
                !isCompleted &&
                (m.status === 'InProgress' ||
                  progressPercent > 0 ||
                  (index === 0 && !isCompleted));

              const isPending = !isCompleted && !isCurrent;
              const hasNextPhase = index < milestones.length - 1;

              return (
                <div key={m.id} className="relative flex flex-col">
                  {/* Phase Card */}
                  <div
                    className={`flex-1 flex flex-col justify-between p-5 rounded-3xl border transition-all duration-200 group relative ${
                      isCompleted
                        ? 'bg-gradient-to-b from-[#0e1713]/90 to-surface-1/90 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                        : isCurrent
                        ? 'bg-gradient-to-b from-violet-950/40 via-surface-1/95 to-surface-1/90 border-violet-500/50 shadow-xl shadow-violet-950/40 ring-1 ring-violet-500/30'
                        : m.isProposed
                        ? 'bg-amber-950/10 border-dashed border-amber-500/30 shadow-md'
                        : m.isLocked
                        ? 'bg-surface-1/80 border-amber-500/20 shadow-md'
                        : 'bg-surface-1/80 border-white/10 hover:border-white/20 shadow-md'
                    }`}
                  >
                    {/* Top Glow bar for active phase */}
                    {isCurrent && (
                      <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent rounded-full" />
                    )}

                    {/* Card Content Top: Step Number & Badges */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Step Number with Status Indicator */}
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold font-mono border transition-colors ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isCurrent
                                ? 'bg-violet-600/30 text-violet-200 border-violet-500/60 ring-2 ring-violet-500/20 shadow-md shadow-violet-900/40'
                                : 'bg-white/5 text-slate-400 border-white/10'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : index + 1}
                          </div>

                          {/* Phase Status Pill */}
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/40 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                              In Progress
                            </span>
                          ) : m.isProposed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Sparkles className="w-2.5 h-2.5" />
                              Proposed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/5 text-slate-400 border border-white/10">
                              <Clock className="w-2.5 h-2.5" />
                              Pending
                            </span>
                          )}
                        </div>

                        {/* Top Right Action Icons (Lock / Approve) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.isLocked && (
                            <span
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title="Locked — editing tasks prevented"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}

                          {/* Lock Toggle Button for Supervisor */}
                          {isSupervisor && !m.isProposed && onLockToggle && (
                            <button
                              type="button"
                              onClick={() => onLockToggle(m.id, m.isLocked)}
                              className={`p-1.5 rounded-lg border text-xs transition-all ${
                                m.isLocked
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                              }`}
                              title={m.isLocked ? 'Unlock Milestone' : 'Lock Milestone (prevents editing tasks)'}
                            >
                              {m.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Supervisor Approve Proposal CTA */}
                          {m.isProposed && isSupervisor && onApproveProposal && (
                            <button
                              type="button"
                              onClick={() => onApproveProposal(m.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Phase Title & Description */}
                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-white tracking-tight leading-snug group-hover:text-violet-200 transition-colors">
                          {m.name}
                        </h4>
                        {m.description && (
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Content Bottom: Weight, Progress Bar, Subtasks, Target Date */}
                    <div className="space-y-3 pt-4 mt-4 border-t border-white/[0.08]">
                      {/* Weight & Progress Percentage */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-slate-300">
                          Contribution <strong className="text-violet-300 font-mono">{m.weightPct}%</strong> weight
                        </span>
                        <span
                          className={`font-bold font-mono text-xs ${
                            isCompleted
                              ? 'text-emerald-300'
                              : isCurrent
                              ? 'text-violet-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {progressPercent}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : isCurrent
                              ? 'bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 shadow-sm shadow-violet-500/50'
                              : 'bg-white/20'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Meta Footer: Approved Tasks & Target Date */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="font-medium">
                          Tasks: <strong className="text-white font-mono">{approvedTasks.length}</strong> /{' '}
                          <span className="font-mono">{milestoneTasks.length}</span> approved
                        </span>

                        {m.targetDate && (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-300">
                            <Calendar className="w-3 h-3 text-violet-400 shrink-0" />
                            <span>Target: <strong className="text-slate-100">{new Date(m.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop / Tablet Horizontal Connector Arrow */}
                  {hasNextPhase && (
                    <div className="hidden xl:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 items-center justify-center pointer-events-none">
                      <div className="w-7 h-7 rounded-full bg-surface-2 border border-white/15 flex items-center justify-center text-slate-400 shadow-md shadow-black/80">
                        <ArrowRight className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
                      </div>
                    </div>
                  )}

                  {/* Mobile Vertical Flow Connector Arrow */}
                  {hasNextPhase && (
                    <div className="flex xl:hidden justify-center py-1 text-slate-500">
                      <ArrowDown className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
