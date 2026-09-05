import React from 'react';
import { Task, Milestone } from '@researchos/shared-types';
import { Calendar as CalendarIcon, Clock, Lock } from 'lucide-react';

export interface WorkspaceCalendarProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick?: (task: Task) => void;
}

export const WorkspaceCalendar: React.FC<WorkspaceCalendarProps> = ({
  tasks = [],
  milestones = [],
  onTaskClick,
}) => {
  // Sort tasks by due date or updated date
  const tasksWithDates = tasks.filter((t) => !!t.dueDate).sort((a, b) => {
    return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
  });

  const tasksWithoutDates = tasks.filter((t) => !t.dueDate);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-[#0D0C18]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-violet-400" />
            <span>Workspace Schedule & Deadlines</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deliverable deadlines and scheduled milestone targets
          </p>
        </div>
      </div>

      {/* Timeline of tasks with due dates */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Scheduled Deadlines ({tasksWithDates.length})
        </h4>

        {tasksWithDates.length === 0 ? (
          <div className="py-10 text-center bg-[#0D0C18]/40 border border-dashed border-white/10 rounded-2xl">
            <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-xs text-slate-400 font-medium">No tasks with specific deadlines.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksWithDates.map((task) => {
              const milestone = milestones.find((m) => m.id === task.milestoneId);

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="p-4 rounded-2xl bg-[#0D0C18]/90 border border-white/10 hover:border-violet-500/40 cursor-pointer transition-all shadow-md hover:shadow-violet-600/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {task.title}
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {task.status}
                    </span>
                  </div>

                  {milestone && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                      {milestone.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                      <span className="truncate">{milestone.name}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5 text-violet-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(task.dueDate!).toLocaleDateString()}</span>
                    </div>
                    <span>{task.assignee?.fullName || 'Unassigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unscheduled Backlog Tasks */}
      {tasksWithoutDates.length > 0 && (
        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Flexible / Backlog Tasks ({tasksWithoutDates.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasksWithoutDates.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 cursor-pointer transition-all flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-slate-300 truncate max-w-[200px]">
                  {task.title}
                </span>
                <span className="text-[10px] text-slate-500">{task.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
