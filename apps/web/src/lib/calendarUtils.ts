import { Task, Milestone } from '@researchos/shared-types';

export type UrgencyLevel = 'completed' | 'overdue' | 'due-today' | 'due-soon' | 'upcoming';
export type CalendarViewMode = 'month' | 'week' | 'list';

export interface CalendarEventItem {
  id: string;
  title: string;
  type: 'task' | 'milestone';
  date: string; // YYYY-MM-DD
  startDate?: string | null;
  dueDate?: string | null;
  status: string;
  progress?: number;
  priority?: string;
  weight?: number;
  milestoneName?: string;
  isLocked?: boolean;
  assigneeName?: string;
  rawTask?: Task;
  rawMilestone?: Milestone;
  urgency: UrgencyLevel;
  diffDays: number;
}

export interface CalendarDayCell {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEventItem[];
}

/**
 * Format a Date object to YYYY-MM-DD string in local time
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an ISO date or date-only string into local midnight Date
 */
export function parseLocalDate(dateStr: string): Date {
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calculate automated deadline urgency
 */
export function calculateUrgency(
  dueDate: string | null | undefined,
  status: string
): { urgency: UrgencyLevel; diffDays: number } {
  if (status === 'Approved' || status === 'Completed' || status === 'Done') {
    return { urgency: 'completed', diffDays: 0 };
  }

  if (!dueDate) {
    return { urgency: 'upcoming', diffDays: 999 };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = parseLocalDate(dueDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { urgency: 'overdue', diffDays };
  }
  if (diffDays === 0) {
    return { urgency: 'due-today', diffDays: 0 };
  }
  if (diffDays <= 3) {
    return { urgency: 'due-soon', diffDays };
  }
  return { urgency: 'upcoming', diffDays };
}

/**
 * Adapt Task and Milestone records into unified CalendarEventItems
 */
export function adaptProjectItemsToCalendarEvents(
  tasks: Task[] = [],
  milestones: Milestone[] = []
): CalendarEventItem[] {
  const events: CalendarEventItem[] = [];

  // Adapt Milestones (treated as Major Milestones ◆)
  milestones.forEach((m) => {
    const targetDate = m.targetDate || m.createdAt;
    if (!targetDate) return;

    const dateKey = targetDate.split('T')[0];
    const { urgency, diffDays } = calculateUrgency(m.targetDate, m.status);

    events.push({
      id: `milestone-${m.id}`,
      title: m.name,
      type: 'milestone',
      date: dateKey,
      dueDate: m.targetDate,
      status: m.status,
      progress: m.status === 'Completed' ? 100 : m.status === 'InProgress' ? 50 : 0,
      weight: m.weightPct,
      isLocked: m.isLocked,
      rawMilestone: m,
      urgency,
      diffDays,
    });
  });

  // Adapt Tasks (treated as Research Activities ●)
  tasks.forEach((t) => {
    const targetDate = t.dueDate || t.updatedAt || t.createdAt;
    if (!targetDate) return;

    const dateKey = targetDate.split('T')[0];
    const { urgency, diffDays } = calculateUrgency(t.dueDate, t.status);
    const parentMilestone = milestones.find((m) => m.id === t.milestoneId);

    events.push({
      id: `task-${t.id}`,
      title: t.title,
      type: 'task',
      date: dateKey,
      dueDate: t.dueDate,
      status: t.status,
      progress: t.status === 'Approved' ? 100 : t.status === 'InProgress' ? 50 : t.status === 'Submitted' ? 80 : 0,
      priority: t.priority,
      milestoneName: parentMilestone?.name,
      isLocked: parentMilestone?.isLocked,
      assigneeName: t.assignee?.fullName,
      rawTask: t,
      urgency,
      diffDays,
    });
  });

  return events;
}

/**
 * Generate 7-column grid days (Mon-Sun) for a given month and year
 */
export function generateMonthGrid(year: number, month: number, events: CalendarEventItem[]): CalendarDayCell[] {
  const cells: CalendarDayCell[] = [];
  const todayKey = formatDateKey(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-based indexing: Sunday=6, Monday=0, Tuesday=1 ...
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const date = new Date(year, month - 1, d);
    const dateString = formatDateKey(date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayEvents = events.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateString === todayKey,
      isWeekend,
      events: dayEvents,
    });
  }

  // Current month days
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateString = formatDateKey(date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayEvents = events.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateString === todayKey,
      isWeekend,
      events: dayEvents,
    });
  }

  // Next month padding days to complete rows (multiples of 7)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7 && remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const dateString = formatDateKey(date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayEvents = events.filter((e) => e.date === dateString);

      cells.push({
        date,
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayKey,
        isWeekend,
        events: dayEvents,
      });
    }
  }

  return cells;
}

/**
 * Generate 7 days for the active week
 */
export function generateWeekDays(currentDate: Date, events: CalendarEventItem[]): CalendarDayCell[] {
  const cells: CalendarDayCell[] = [];
  const todayKey = formatDateKey(new Date());

  const current = new Date(currentDate);
  let dayOfWeek = current.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  // Set to Monday of current week
  current.setDate(current.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(current);
    date.setDate(current.getDate() + i);
    const dateString = formatDateKey(date);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;

    const dayEvents = events.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber: date.getDate(),
      isCurrentMonth: true,
      isToday: dateString === todayKey,
      isWeekend,
      events: dayEvents,
    });
  }

  return cells;
}

/**
 * Filter and categorize events for Deadline Overview Sidebar
 */
export function getSidebarDeadlineBuckets(events: CalendarEventItem[]) {
  const dueToday = events.filter((e) => e.urgency === 'due-today');
  const overdue = events.filter((e) => e.urgency === 'overdue').sort((a, b) => a.diffDays - b.diffDays);
  const dueSoon = events.filter((e) => e.urgency === 'due-soon').sort((a, b) => a.diffDays - b.diffDays);
  const upcomingMilestones = events
    .filter((e) => e.type === 'milestone' && e.urgency !== 'completed' && e.urgency !== 'overdue')
    .sort((a, b) => a.diffDays - b.diffDays);
  const completed = events.filter((e) => e.urgency === 'completed');

  return {
    dueToday,
    overdue,
    dueSoon,
    upcomingMilestones,
    completed,
  };
}
