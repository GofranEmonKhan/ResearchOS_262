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
  Database,
  Cpu,
  Share2,
  FileText,
  ChevronRight,
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

const getMilestoneIcon = (name: string, index: number) => {
  const lower = name.toLowerCase();
  if (lower.includes('data') || lower.includes('curat') || lower.includes('collect') || lower.includes('token')) {
    return <Database className="w-4 h-4" />;
  }
  if (lower.includes('model') || lower.includes('transform') || lower.includes('train') || lower.includes('kernel') || lower.includes('baseline')) {
    return <Cpu className="w-4 h-4" />;
  }
  if (lower.includes('distribut') || lower.includes('scal') || lower.includes('loss') || lower.includes('gpu') || lower.includes('cluster')) {
    return <Share2 className="w-4 h-4" />;
  }
  if (lower.includes('manuscript') || lower.includes('paper') || lower.includes('submi') || lower.includes('publish') || lower.includes('neurips') || lower.includes('camera')) {
    return <FileText className="w-4 h-4" />;
  }
  const defaultIcons = [
    <Database className="w-4 h-4" key="db" />,
    <Cpu className="w-4 h-4" key="cpu" />,
    <Share2 className="w-4 h-4" key="net" />,
    <FileText className="w-4 h-4" key="doc" />,
  ];
  return defaultIcons[index % defaultIcons.length];
};

const getMilestoneTags = (m: Milestone): string[] => {
  const lower = (m.name + ' ' + (m.description || '')).toLowerCase();
  const tags: string[] = [];
  if (lower.includes('data') || lower.includes('curat')) tags.push('Data Curation');
  if (lower.includes('token')) tags.push('Tokenizer');
  if (lower.includes('preprocess') || lower.includes('clean')) tags.push('Preprocessing');
  if (lower.includes('model') || lower.includes('transform')) tags.push('Modeling');
  if (lower.includes('flashattention') || lower.includes('attention')) tags.push('FlashAttention');
  if (lower.includes('kernel') || lower.includes('cuda')) tags.push('Kernel');
  if (lower.includes('distribut')) tags.push('Distributed');
  if (lower.includes('scal')) tags.push('Scaling');
  if (lower.includes('converg') || lower.includes('loss')) tags.push('Convergence');
  if (lower.includes('latex')) tags.push('LaTeX');
  if (lower.includes('figure')) tags.push('Figures');
  if (lower.includes('submi') || lower.includes('publish') || lower.includes('camera')) tags.push('Submission');
  if (tags.length === 0) {
    tags.push(`Phase ${m.weightPct}% weight`);
  }
  return tags.slice(0, 3);
};

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

  const overallProgress = React.useMemo(() => {
    if (project?.progressPct !== undefined && project?.progressPct !== null && project.progressPct > 0) {
      return project.progressPct;
    }
    if (milestones.length === 0) return 0;
    let totalWeight = 0;
    let earnedProgress = 0;
    milestones.forEach((m) => {
      const mTasks = tasks.filter((t) => t.milestoneId === m.id);
      const approved = mTasks.filter((t) => t.status === 'Approved');
      const mProgress =
        mTasks.length > 0
          ? approved.length / mTasks.length
          : m.status === 'Completed'
          ? 1
          : 0;
      const weight = m.weightPct || 100 / milestones.length;
      totalWeight += weight;
      earnedProgress += mProgress * weight;
    });
    return totalWeight > 0 ? Math.round((earnedProgress / totalWeight) * 100) : 0;
  }, [project, milestones, tasks]);

  return (
    <div className="bg-[#0b0f19]/90 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/5">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-violet-600/30 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Research Journey</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              From data to publication — key milestones, dependencies and progress.
            </p>
          </div>
        </div>

        {/* Header Right: Overall Progress + Propose/Add Milestone Action */}
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-2.5 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <span className="text-xs font-medium text-slate-300">Overall Progress</span>
            <div className="w-24 sm:w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-white min-w-[28px] text-right">{overallProgress}%</span>
          </div>

          <button
            onClick={onOpenNewMilestone}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSupervisor ? 'Add Milestone' : 'Propose Milestone'}</span>
          </button>
        </div>
      </div>

      {/* Roadmap Cards Grid / Horizontal Flow */}
      <div className="mt-6">
        {milestones.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/40 border border-dashed border-white/10 rounded-2xl">
            <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
            <p className="text-xs text-slate-300 font-semibold">No milestones defined yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Define your research milestones to plot your journey.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
            {milestones.map((m, index) => {
              const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
              const approvedTasks = milestoneTasks.filter((t) => t.status === 'Approved');
              const progressPercent =
                milestoneTasks.length > 0
                  ? Math.round((approvedTasks.length / milestoneTasks.length) * 100)
                  : m.status === 'Completed'
                  ? 100
                  : 0;

              const isCompleted = m.status === 'Completed' || progressPercent === 100;
              const isInProgress = !isCompleted && (m.status === 'InProgress' || progressPercent > 0);
              const isProposed = m.isProposed || m.status === 'Proposed';

              const tags = getMilestoneTags(m);

              const formattedTargetDate = m.targetDate
                ? new Date(m.targetDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              const formattedStartDate = m.createdAt
                ? new Date(m.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              return (
                <React.Fragment key={m.id}>
                  {/* Phase Card */}
                  <div
                    className={`flex-1 min-w-[240px] p-4 sm:p-4.5 rounded-2xl transition-all duration-300 flex flex-col justify-between relative group ${
                      isCompleted
                        ? 'bg-[#0d1424]/90 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)] hover:border-emerald-500/50'
                        : isInProgress
                        ? 'bg-[#111226]/95 border-2 border-violet-500/70 shadow-[0_0_25px_rgba(139,92,246,0.18)] ring-1 ring-violet-500/30'
                        : isProposed
                        ? 'bg-amber-950/10 border-2 border-dashed border-amber-500/40 hover:border-amber-500/60'
                        : m.isLocked
                        ? 'bg-[#0d121f]/90 border border-amber-500/20 shadow-lg shadow-amber-950/20'
                        : 'bg-[#0d121f]/80 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Domain Icon + Phase Number Badge + Status Pill */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          {/* Domain Icon */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isInProgress
                                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                                : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}
                          >
                            {getMilestoneIcon(m.name, index)}
                          </div>

                          {/* Phase Number / Check */}
                          {isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                                isInProgress
                                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/40'
                                  : 'bg-slate-800 text-slate-400 border border-white/10'
                              }`}
                            >
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Status / Proposal / Lock Pill */}
                        <div className="flex items-center space-x-1.5">
                          {isProposed && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Proposed
                            </span>
                          )}
                          {m.isLocked && !isProposed && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          )}
                          {!isProposed && !m.isLocked && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1 ${
                                isCompleted
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isInProgress
                                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                                  : 'bg-slate-800/80 text-slate-400 border border-white/10'
                              }`}
                            >
                              {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {isInProgress && <Clock className="w-2.5 h-2.5" />}
                              {!isCompleted && !isInProgress && <Clock className="w-2.5 h-2.5" />}
                              {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Milestone Title */}
                      <h4 className="text-sm font-bold text-white mt-3 leading-snug tracking-tight line-clamp-2">
                        {m.name}
                      </h4>

                      {/* Description */}
                      {m.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      {/* Contribution */}
                      <div className="mt-2 text-xs text-slate-400">
                        Contribution:{' '}
                        <span className="text-sky-400 font-bold">{m.weightPct}%</span>{' '}
                        <span className="text-[10px] text-slate-500 font-normal">(weight)</span>
                      </div>

                      {/* Progress Bar & Percentage */}
                      <div className="mt-2.5 flex items-center space-x-2">
                        <div className="flex-1 bg-slate-800/90 rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : isInProgress
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300 min-w-[28px] text-right">
                          {progressPercent}%
                        </span>
                      </div>

                      {/* Date Range / Target Date */}
                      <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {formattedStartDate && formattedTargetDate
                            ? `${formattedStartDate} – ${formattedTargetDate}`
                            : formattedTargetDate
                            ? `Target: ${formattedTargetDate}`
                            : 'Schedule pending'}
                        </span>
                      </div>

                      {/* Tags / Metadata Pills */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800/70 text-slate-300 border border-white/5 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Footer: Supervisor Actions & Visual Indicator */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      {/* Left: Supervisor Lock / Approve controls */}
                      <div className="flex items-center space-x-1.5">
                        {isSupervisor && !isProposed && onLockToggle && (
                          <button
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

                        {isProposed && isSupervisor && onApproveProposal && (
                          <button
                            onClick={() => onApproveProposal(m.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm shadow-emerald-600/20 flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                      </div>

                      {/* Right: Status Icon or Action Indicator */}
                      <div className="flex items-center">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800/60 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-violet-400 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connector Arrow (Desktop only, between adjacent cards) */}
                  {index < milestones.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center px-0.5 text-slate-600 shrink-0">
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

