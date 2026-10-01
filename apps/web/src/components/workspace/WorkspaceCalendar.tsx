import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  Plus,
  Sparkles,
  Lock,
  ArrowRight,
  Check,
  Flame,
  LayoutGrid,
  CalendarRange,
  ListFilter,
  User as UserIcon,
} from 'lucide-react';
import { Task, Milestone } from '@researchos/shared-types';
import {
  CalendarViewMode,
  CalendarEventItem,
  adaptProjectItemsToCalendarEvents,
  generateMonthGrid,
  generateWeekDays,
  getSidebarDeadlineBuckets,
} from '../../lib/calendarUtils.js';

export interface WorkspaceCalendarProps {
  tasks: Task[];
  milestones: Milestone[];
  projectId?: string;
  currentUserId?: string;
  currentUserRole?: string;
  onTaskClick?: (task: Task) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  onAddTask?: (dateString?: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WorkspaceCalendar: React.FC<WorkspaceCalendarProps> = ({
  tasks = [],
  milestones = [],
  onTaskClick,
  onMilestoneClick,
  onAddTask,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState<string>('all');
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(false);
  const [showTasksOnly, setShowTasksOnly] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 1. Adapt tasks & milestones to calendar events
  const allEvents = useMemo(() => {
    return adaptProjectItemsToCalendarEvents(tasks, milestones);
  }, [tasks, milestones]);

  // 2. Filter events based on search & filter toggles
  const filteredEvents = useMemo(() => {
    return allEvents.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMilestone = item.milestoneName?.toLowerCase().includes(q);
        const matchesAssignee = item.assigneeName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMilestone && !matchesAssignee) return false;
      }

      // Type toggles
      if (showMilestonesOnly && item.type !== 'milestone') return false;
      if (showTasksOnly && item.type !== 'task') return false;

      // Urgency filter
      if (selectedUrgencyFilter !== 'all') {
        if (selectedUrgencyFilter === 'overdue' && item.urgency !== 'overdue') return false;
        if (selectedUrgencyFilter === 'due-today' && item.urgency !== 'due-today') return false;
        if (selectedUrgencyFilter === 'due-soon' && item.urgency !== 'due-soon') return false;
        if (selectedUrgencyFilter === 'completed' && item.urgency !== 'completed') return false;
        if (selectedUrgencyFilter === 'upcoming' && item.urgency !== 'upcoming') return false;
      }

      return true;
    });
  }, [allEvents, searchQuery, showMilestonesOnly, showTasksOnly, selectedUrgencyFilter]);

  // 3. Generate Month Grid
  const monthGrid = useMemo(() => {
    return generateMonthGrid(year, month, filteredEvents);
  }, [year, month, filteredEvents]);

  // 4. Generate Week Days
  const weekDays = useMemo(() => {
    return generateWeekDays(currentDate, filteredEvents);
  }, [currentDate, filteredEvents]);

  // 5. Sidebar Deadline Buckets (computed from all unfiltered events for full awareness)
  const sidebarBuckets = useMemo(() => {
    return getSidebarDeadlineBuckets(allEvents);
  }, [allEvents]);

  // Date Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'month' || viewMode === 'list') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      setCurrentDate(nextDate);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month' || viewMode === 'list') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      setCurrentDate(nextDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleItemClick = (item: CalendarEventItem) => {
    if (item.type === 'task' && item.rawTask && onTaskClick) {
      onTaskClick(item.rawTask);
    } else if (item.type === 'milestone' && item.rawMilestone && onMilestoneClick) {
      onMilestoneClick(item.rawMilestone);
    }
  };

  // Helper for Urgency Styles
  const getUrgencyBadge = (urgency: string, diffDays: number) => {
    switch (urgency) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-2.5 h-2.5" />
            {Math.abs(diffDays)}d overdue
          </span>
        );
      case 'due-today':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/25 text-rose-200 border border-rose-500/50 animate-pulse">
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            Due Today
          </span>
        );
      case 'due-soon':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            in {diffDays}d
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Check className="w-2.5 h-2.5" />
            Done
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-200">
      {/* ─── 1. COMMAND CENTER TOP TOOLBAR ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#090A15]/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
        {/* Left: Month / Date Navigator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Month/Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Month/Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30 transition-all cursor-pointer"
            >
              Today
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{MONTH_NAMES[month]} {year}</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredEvents.length} activities
            </span>
          </h2>
        </div>

        {/* Right: View Switcher & Search / Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
              className="w-36 sm:w-44 pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:w-52 transition-all"
            />
          </div>

          {/* New Task Action */}
          {onAddTask && (
            <button
              onClick={() => onAddTask()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. FILTER PILLS BAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
          <SlidersHorizontal className="w-3 h-3" /> Filters:
        </span>

        {/* Urgency status filters */}
        {[
          { id: 'all', label: 'All Items' },
          { id: 'due-today', label: `🔴 Due Today (${sidebarBuckets.dueToday.length})` },
          { id: 'overdue', label: `🔴 Overdue (${sidebarBuckets.overdue.length})` },
          { id: 'due-soon', label: `🟡 Due Soon (${sidebarBuckets.dueSoon.length})` },
          { id: 'completed', label: `🟢 Completed (${sidebarBuckets.completed.length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedUrgencyFilter(f.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedUrgencyFilter === f.id
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Milestones Only Toggle */}
        <button
          onClick={() => {
            setShowMilestonesOnly(!showMilestonesOnly);
            if (!showMilestonesOnly) setShowTasksOnly(false);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            showMilestonesOnly
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-900/80 border border-slate-800 text-purple-300 hover:bg-purple-950/40'
          }`}
        >
          <span>◆ Milestones Only</span>
        </button>
      </div>

      {/* ─── 3. MAIN 70/30 GRID & SIDEBAR LAYOUT ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 70%: Interactive Calendar View Area */}
        <div className="lg:col-span-8 space-y-4">
          {/* VIEW MODE: MONTH GRID */}
          {viewMode === 'month' && (
            <div className="rounded-2xl border border-slate-800/90 bg-[#080914]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
              {/* Weekday Header Row */}
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center py-2.5">
                {WEEKDAY_NAMES.map((name, idx) => (
                  <div
                    key={name}
                    className={`text-xs font-bold uppercase tracking-wider ${
                      idx >= 5 ? 'text-indigo-400/80' : 'text-slate-400'
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* 7-Column Day Cells Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/80 border-b border-slate-800/80">
                {monthGrid.map((cell, idx) => {
                  return (
                    <div
                      key={idx}
                      onClick={() => onAddTask?.(cell.dateString)}
                      className={`min-h-[145px] sm:min-h-[160px] p-2 sm:p-2.5 flex flex-col justify-between transition-colors relative group cursor-pointer ${
                        cell.isCurrentMonth
                          ? cell.isWeekend
                            ? 'bg-[#060710]/90 hover:bg-slate-900/60'
                            : 'bg-transparent hover:bg-slate-900/40'
                          : 'bg-slate-950/80 opacity-35 hover:opacity-60'
                      } ${
                        cell.isToday
                          ? 'ring-2 ring-inset ring-violet-500/90 bg-violet-950/20 shadow-inner'
                          : ''
                      }`}
                    >
                      {/* Date Number & Today Pill / Add Button */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-sm font-extrabold rounded-md px-1.5 py-0.5 transition-all ${
                              cell.isToday
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono shadow-md shadow-violet-600/30'
                                : cell.isCurrentMonth
                                ? 'text-slate-100 group-hover:text-white'
                                : 'text-slate-500 font-medium'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {cell.isToday && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-violet-500/25 text-violet-200 border border-violet-500/40 tracking-wider">
                              Today
                            </span>
                          )}
                        </div>

                        {/* Quick Add Task Button on Hover */}
                        {onAddTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTask(cell.dateString);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-800/90 hover:bg-violet-600 text-slate-400 hover:text-white transition-all shadow-sm"
                            title={`Add task for ${cell.dateString}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Cell Events List */}
                      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[115px] no-scrollbar">
                        {cell.events.slice(0, 3).map((item) => {
                          const isMilestone = item.type === 'milestone';

                          if (isMilestone) {
                            return (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemClick(item);
                                }}
                                className="p-1.5 sm:p-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border cursor-pointer bg-gradient-to-r from-purple-950/95 via-indigo-950/90 to-purple-950/80 border-purple-500/50 hover:border-purple-400 text-white shadow-md shadow-purple-950/40 space-y-1 hover:scale-[1.02]"
                                title={`Milestone: ${item.title} (${item.status})`}
                              >
                                <div className="flex items-center justify-between gap-1 text-[9px] font-mono text-purple-300">
                                  <span className="flex items-center gap-1 font-extrabold tracking-wider">
                                    <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                    MILESTONE
                                  </span>
                                  {item.weight !== undefined && (
                                    <span className="bg-purple-900/70 px-1 py-0.2 rounded border border-purple-500/30 text-[8px]">
                                      {item.weight}% wt
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-extrabold text-white text-[11px] leading-snug line-clamp-2">
                                  {item.title}
                                </h5>
                                {item.status === 'Completed' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-300 font-semibold">
                                    <Check className="w-2.5 h-2.5" /> Completed
                                  </span>
                                ) : (
                                  <div className="w-full bg-slate-900/80 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full"
                                      style={{ width: `${item.progress ?? 50}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(item);
                              }}
                              className={`p-1.5 sm:p-2 rounded-xl text-[10px] sm:text-[11px] transition-all border cursor-pointer space-y-1 hover:scale-[1.02] shadow-sm ${
                                item.urgency === 'due-today'
                                  ? 'bg-gradient-to-br from-rose-950/90 to-slate-950/95 border-rose-500/90 text-white shadow-lg shadow-rose-950/60 ring-1 ring-rose-500/40 animate-pulse'
                                  : item.urgency === 'overdue'
                                  ? 'bg-rose-950/55 border-rose-500/50 text-rose-100 hover:border-rose-400 shadow-sm'
                                  : item.urgency === 'due-soon'
                                  ? 'bg-amber-950/55 border-amber-500/50 text-amber-100 hover:border-amber-400'
                                  : item.urgency === 'completed'
                                  ? 'bg-emerald-950/35 border-emerald-500/35 text-emerald-200 opacity-80 hover:opacity-100'
                                  : 'bg-slate-900/95 border-slate-700/80 text-slate-100 hover:border-slate-500 hover:bg-slate-850'
                              }`}
                              title={`${item.title} (${item.status}) — Assignee: ${item.assigneeName || 'Unassigned'}`}
                            >
                              {/* Top Row: Urgency Tag / Priority Badge */}
                              <div className="flex items-center justify-between gap-1 text-[9px]">
                                <div className="flex items-center gap-1 font-bold truncate">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      item.urgency === 'due-today' || item.urgency === 'overdue'
                                        ? 'bg-rose-400'
                                        : item.urgency === 'due-soon'
                                        ? 'bg-amber-400'
                                        : item.urgency === 'completed'
                                        ? 'bg-emerald-400'
                                        : 'bg-indigo-400'
                                    }`}
                                  />
                                  {item.priority && (
                                    <span
                                      className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider ${
                                        item.priority === 'High'
                                          ? 'text-rose-300 bg-rose-500/20 border border-rose-500/30'
                                          : item.priority === 'Medium'
                                          ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                                          : 'text-sky-300 bg-sky-500/20 border border-sky-500/30'
                                      }`}
                                    >
                                      {item.priority}
                                    </span>
                                  )}
                                </div>

                                {item.urgency === 'due-today' && (
                                  <span className="text-[9px] font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5 text-rose-400" /> Today
                                  </span>
                                )}
                                {item.urgency === 'overdue' && item.diffDays && (
                                  <span className="text-[9px] font-bold text-rose-400">
                                    {Math.abs(item.diffDays)}d late
                                  </span>
                                )}
                                {item.urgency === 'due-soon' && item.diffDays && (
                                  <span className="text-[9px] font-bold text-amber-300">
                                    in {item.diffDays}d
                                  </span>
                                )}
                                {item.urgency === 'completed' && (
                                  <span className="text-[9px] font-bold text-emerald-400">
                                    Done
                                  </span>
                                )}
                              </div>

                              {/* Task Heading / Title */}
                              <h5 className="font-semibold text-slate-100 text-[11px] leading-snug line-clamp-2 tracking-tight">
                                {item.title}
                              </h5>

                              {/* Bottom row: Assignee snippet + Status pill */}
                              <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400 pt-1 border-t border-white/5">
                                {item.assigneeName ? (
                                  <span className="truncate flex items-center gap-1 text-slate-300 font-medium">
                                    <UserIcon className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{item.assigneeName.split(' ')[0]}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[8px]">Unassigned</span>
                                )}
                                <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 text-[8px] font-medium shrink-0">
                                  {item.status === 'Approved'
                                    ? 'Done'
                                    : item.status === 'InProgress'
                                    ? 'In Dev'
                                    : item.status === 'Submitted'
                                    ? 'Review'
                                    : 'To Do'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {cell.events.length > 3 && (
                          <span className="text-[9px] font-mono font-bold text-violet-400 block text-right px-1">
                            +{cell.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="rounded-2xl border border-slate-800/90 bg-[#080914]/90 p-4 shadow-2xl backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col justify-between min-h-[220px] ${
                      day.isToday
                        ? 'bg-violet-950/20 border-violet-500/50 ring-1 ring-violet-500/30'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          {WEEKDAY_NAMES[idx]}
                        </span>
                        <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                          day.isToday ? 'bg-violet-600 text-white' : 'text-slate-200'
                        }`}>
                          {day.dayNumber}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {day.events.length === 0 ? (
                          <span className="text-[10px] text-slate-600 italic block py-6 text-center">
                            No scheduled items
                          </span>
                        ) : (
                          day.events.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleItemClick(item)}
                              className={`p-2.5 rounded-xl border cursor-pointer text-xs space-y-1.5 transition-all hover:scale-[1.02] shadow-md ${
                                item.type === 'milestone'
                                  ? 'bg-purple-950/80 border-purple-500/50 hover:border-purple-400 text-white'
                                  : item.urgency === 'due-today'
                                  ? 'bg-rose-950/80 border-rose-500 text-white ring-1 ring-rose-500/50 animate-pulse'
                                  : item.urgency === 'overdue'
                                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-100 hover:border-rose-400'
                                  : item.urgency === 'due-soon'
                                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-100 hover:border-amber-400'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[9px]">
                                {item.type === 'milestone' ? (
                                  <span className="font-extrabold text-purple-300 flex items-center gap-1 uppercase tracking-wider">
                                    <Sparkles className="w-2.5 h-2.5" /> Milestone
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {item.priority && (
                                      <span className={`px-1 py-0.2 rounded font-bold uppercase ${
                                        item.priority === 'High'
                                          ? 'text-rose-300 bg-rose-500/20'
                                          : item.priority === 'Medium'
                                          ? 'text-amber-300 bg-amber-500/20'
                                          : 'text-sky-300 bg-sky-500/20'
                                      }`}>
                                        {item.priority}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {getUrgencyBadge(item.urgency, item.diffDays)}
                              </div>

                              <h5 className="font-bold text-white text-[11px] leading-snug line-clamp-2">
                                {item.title}
                              </h5>

                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-white/5">
                                {item.assigneeName ? (
                                  <span className="truncate flex items-center gap-1 text-slate-300 font-medium">
                                    <UserIcon className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{item.assigneeName.split(' ')[0]}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Unassigned</span>
                                )}
                                <span className="font-mono text-slate-300">
                                  {item.progress !== undefined ? `${item.progress}%` : ''}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {onAddTask && (
                      <button
                        onClick={() => onAddTask(day.dateString)}
                        className="mt-2 w-full py-1 text-[10px] font-bold text-slate-500 hover:text-violet-300 hover:bg-slate-800/60 rounded border border-dashed border-slate-800 transition-colors"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW MODE: LIST / AGENDA VIEW */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
                  <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No scheduled activities found</p>
                  <p className="text-xs text-slate-500 mt-1">Try changing search filters or create a new task.</p>
                </div>
              ) : (
                filteredEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-3.5 rounded-2xl bg-[#090A15]/90 border border-slate-800/80 hover:border-violet-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          item.type === 'milestone'
                            ? 'bg-purple-500/10 border border-purple-500/25 text-purple-400'
                            : 'bg-violet-500/10 border border-violet-500/25 text-violet-400'
                        }`}>
                          {item.type === 'milestone' ? <Sparkles className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white">
                              {item.title}
                            </h4>
                            {item.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>Target Date: {item.date}</span>
                            {item.milestoneName && (
                              <>
                                <span>•</span>
                                <span className="text-purple-300">Milestone: {item.milestoneName}</span>
                              </>
                            )}
                            {item.assigneeName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <UserIcon className="w-3 h-3" /> {item.assigneeName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {getUrgencyBadge(item.urgency, item.diffDays)}
                        <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {item.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT 30%: DEADLINE OVERVIEW SIDEBAR */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-[#090A15]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>Deadline Overview</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Live Status</span>
            </div>

            {/* SECTION 1: Due Today */}
            {sidebarBuckets.dueToday.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" /> Due Today
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 font-mono text-[10px]">
                    {sidebarBuckets.dueToday.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {sidebarBuckets.dueToday.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 hover:border-rose-400 cursor-pointer transition-all text-xs"
                    >
                      <p className="font-bold text-white line-clamp-1">{item.title}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                        <span>Progress: {item.progress ?? 0}%</span>
                        <span className="text-rose-300 font-semibold flex items-center gap-0.5">
                          Open →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: Overdue */}
            {sidebarBuckets.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Overdue
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                    {sidebarBuckets.overdue.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {sidebarBuckets.overdue.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 hover:border-rose-400/50 cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-slate-200 line-clamp-1">{item.title}</p>
                        <span className="text-[10px] font-bold text-rose-400 shrink-0">
                          {Math.abs(item.diffDays)}d late
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Due date was {item.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: Due Soon */}
            {sidebarBuckets.dueSoon.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Due Soon (1–3 Days)
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px]">
                    {sidebarBuckets.dueSoon.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {sidebarBuckets.dueSoon.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 hover:border-amber-400/50 cursor-pointer transition-all text-xs"
                    >
                      <p className="font-semibold text-slate-200 line-clamp-1">{item.title}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>Due in {item.diffDays} days</span>
                        <span className="text-amber-300">Target: {item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Major Milestones Checkpoints */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Major Milestones
                </span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 font-mono text-[10px]">
                  {milestones.length}
                </span>
              </div>

              {milestones.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-2">No milestones defined for this project.</p>
              ) : (
                <div className="space-y-2">
                  {milestones.slice(0, 4).map((m) => {
                    const progress = m.status === 'Completed' ? 100 : m.status === 'InProgress' ? 50 : 0;
                    return (
                      <div
                        key={m.id}
                        onClick={() => onMilestoneClick?.(m)}
                        className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 hover:border-purple-400/50 cursor-pointer transition-all text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate">◆ {m.name}</span>
                          <span className="text-[10px] font-mono text-purple-300">{progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Target: {m.targetDate ? m.targetDate.split('T')[0] : 'Flexible'}</span>
                          <span className="text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-0.5">
                            Details <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Empty State when everything is cleared */}
            {sidebarBuckets.dueToday.length === 0 && sidebarBuckets.overdue.length === 0 && sidebarBuckets.dueSoon.length === 0 && (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-200">All Deadlines Up to Date</p>
                <p className="text-[10px] text-slate-500">No overdue deliverables or pending today milestones.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
