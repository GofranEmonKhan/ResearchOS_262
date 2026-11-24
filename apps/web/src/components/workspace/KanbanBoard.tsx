import React, { useState } from 'react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Milestone,
  ProjectMember,
  Project,
} from '@researchos/shared-types';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Lock,
  Sparkles,
  Check,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar.js';
import { HoverSelect } from '../common/HoverSelect.js';

export interface KanbanBoardProps {
  tasks: Task[];
  milestones: Milestone[];
  members: ProjectMember[];
  project: Project;
  currentUserId?: string;
  currentUserRole?: string;
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onReviewTask?: (task: Task) => void;
  onApproveProposal?: (taskId: string) => void;
  onOpenNewTask?: () => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string; bgBadge: string }[] = [
  { id: 'ToDo', title: 'To Do', color: 'text-slate-400', bgBadge: 'bg-slate-800/80 border-slate-700 text-slate-300' },
  { id: 'InProgress', title: 'In Progress', color: 'text-sky-400', bgBadge: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
  { id: 'Submitted', title: 'Under Review', color: 'text-amber-400', bgBadge: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  { id: 'RevisionRequested', title: 'Revision Needed', color: 'text-rose-400', bgBadge: 'bg-rose-500/10 border-rose-500/30 text-rose-300' },
  { id: 'Approved', title: 'Approved', color: 'text-emerald-400', bgBadge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks = [],
  milestones = [],
  members = [],
  project,
  currentUserId,
  currentUserRole,
  onTaskClick,
  onTaskMove,
  onReviewTask,
  onApproveProposal,
  onOpenNewTask,
}) => {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isSupervisor = currentUserRole === 'Supervisor' || project.ownerId === currentUserId;

  const filteredTasks = tasks.filter((t) => {
    if (selectedMilestoneId !== 'all' && t.milestoneId !== selectedMilestoneId) return false;
    if (selectedAssigneeId !== 'all' && t.assigneeId !== selectedAssigneeId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Medium</span>;
      case 'Low':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-700 text-slate-300 border border-white/5">Low</span>;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Filters & Search Bar */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 bg-[#0D0C18] p-3.5 rounded-2xl border border-white/10 shadow-md">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Milestone Filter */}
          <HoverSelect
            value={selectedMilestoneId}
            onChange={(val) => setSelectedMilestoneId(val)}
            options={[
              { value: 'all', label: 'All Milestones' },
              ...milestones.map((m) => ({
                value: m.id,
                label: m.name,
                badge: m.isLocked ? '🔒 Locked' : undefined,
              })),
            ]}
            className="w-48 sm:w-56"
          />

          {/* Assignee Filter */}
          <HoverSelect
            value={selectedAssigneeId}
            onChange={(val) => setSelectedAssigneeId(val)}
            options={[
              { value: 'all', label: 'All Assignees' },
              ...members.map((m) => ({
                value: m.userId,
                label: m.user?.fullName || 'Member',
                badge: m.projectRole,
              })),
            ]}
            className="w-44 sm:w-52"
          />

          {/* Search Input */}
          <input
            type="text"
            placeholder="Filter tasks by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[38px] min-h-[38px] bg-white/5 border border-white/10 text-xs rounded-xl px-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 w-44 sm:w-56 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredTasks.length}</strong> tasks
          </span>
          <button
            onClick={onOpenNewTask}
            className="h-[38px] min-h-[38px] flex items-center space-x-1.5 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1 overflow-x-auto pb-4 items-start">
        {COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter((t) => t.status === column.id);

          return (
            <div
              key={column.id}
              className="flex flex-col rounded-2xl bg-[#0D0C18]/60 border border-white/10 p-3 min-w-[260px] max-h-[calc(100vh-210px)] overflow-hidden shadow-lg shadow-black/40"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-xs ${column.color}`}>{column.title}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${column.bgBadge}`}>
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Task Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {columnTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
                    <p className="text-[11px] text-slate-600 font-medium">No tasks</p>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const milestone = milestones.find((m) => m.id === task.milestoneId);
                    const isAssignedToMe = task.assigneeId === currentUserId;
                    const canMoveToInProgress = task.status === 'ToDo' && (isAssignedToMe || isSupervisor);
                    const canSubmit = (task.status === 'InProgress' || task.status === 'RevisionRequested') && isAssignedToMe;
                    const canSupervisorReview = task.status === 'Submitted' && isSupervisor;

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick?.(task)}
                        className={`group relative rounded-xl p-3.5 bg-[#141224] hover:bg-[#1A182F] border transition-all duration-200 cursor-pointer shadow-md hover:shadow-violet-600/10 ${
                          task.isProposed
                            ? 'border-dashed border-amber-500/40 bg-amber-950/10'
                            : 'border-white/10 hover:border-violet-500/40'
                        }`}
                      >
                        {/* Proposal Badge */}
                        {task.isProposed && (
                          <div className="mb-2 flex items-center justify-between">
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 mr-1" /> Proposed Task
                            </span>
                            {isSupervisor && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApproveProposal?.(task.id);
                                }}
                                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center space-x-1"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                            )}
                          </div>
                        )}

                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                            {task.title}
                          </h4>
                          {getPriorityBadge(task.priority)}
                        </div>

                        {/* Description snippet */}
                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Milestone Tag */}
                        {milestone && (
                          <div className="mt-2.5 flex items-center space-x-1.5 text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 w-fit">
                            {milestone.isLocked ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : null}
                            <span className="truncate max-w-[150px]">{milestone.name}</span>
                          </div>
                        )}

                        {/* Revision Note preview if RevisionRequested */}
                        {task.status === 'RevisionRequested' && task.revisionNote && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[10px] text-rose-300 flex items-start space-x-1.5">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{task.revisionNote}</span>
                          </div>
                        )}

                        {/* Footer: Assignee & Action Buttons */}
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                          {/* Assignee Avatar */}
                          <div className="flex items-center space-x-1.5">
                            <UserAvatar
                              photoUrl={task.assignee?.photoUrl}
                              name={task.assignee?.fullName}
                              role={task.assignee?.role}
                              size="xs"
                              className="w-5 h-5 text-[9px]"
                            />
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                              {task.assignee?.fullName || 'Unassigned'}
                            </span>
                          </div>

                          {/* Quick Workflow Action Buttons */}
                          <div className="flex items-center space-x-1">
                            {canMoveToInProgress && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskMove?.(task.id, 'InProgress');
                                }}
                                className="px-2 py-1 text-[10px] font-medium rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all flex items-center space-x-1"
                                title="Start Task"
                              >
                                <span>Start</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {canSubmit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskMove?.(task.id, 'Submitted');
                                }}
                                className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-1"
                                title="Submit for Review"
                              >
                                <span>Submit</span>
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            )}

                            {canSupervisorReview && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReviewTask?.(task);
                                }}
                                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all flex items-center space-x-1"
                                title="Review Submission"
                              >
                                <span>Review</span>
                              </button>
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
        })}
      </div>
    </div>
  );
};
