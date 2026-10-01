# ResearchOS — Research Calendar & Deadline Command Center Implementation Plan

> **Specification Reference**: `Calendar.md` & `docs/specs/02-research-workspace.md`  
> **Status**: Approved for Implementation  
> **Target Package**: `@researchos/web` (Frontend Component & Adapter Engine)

---

## 1. Overview & Objectives

Transform the minimal calendar tab (`WorkspaceCalendar.tsx`) into an **Academic Research Calendar + Deadline Tracker + Milestone Command Center**:
1. **Interactive Monthly Calendar Grid**: 7-column layout (Mon–Sun), month/year navigator with `Today` instant jump, distinct current day highlight, and multi-event date cells with urgency status badges.
2. **Multi-View Modes**:
   - `Month View`: Full high-level research trajectory and monthly schedule.
   - `Week View`: Focused daily deliverable schedule.
   - `List / Agenda View`: Chronologically grouped upcoming and overdue milestones.
3. **Multi-Day Activities & Spanning Bars**: Visual duration bars for research phases (e.g., *Experiment Phase*, *Dataset Annotation*).
4. **Automated Research Urgency Engine**:
   - 🔴 **Due Today**: Items due on current date.
   - 🔴 **Overdue**: Incomplete items past due with exact day counts.
   - 🟡 **Due Soon**: Items maturing within 1–3 days.
   - 🔵 **Upcoming**: Normal future deliverables (> 3 days).
   - 🟢 **Completed**: Verified `✓` / `Approved` tasks.
   - ◆ **Major Milestones**: High-visibility diamond checkpoint badges.
5. **Desktop Deadline Overview Sidebar (70/30 Split)**:
   - Dedicated side panel with `Due Today`, `Due Soon`, `Overdue`, and `Upcoming Milestones`.
   - Direct 1-click links to `TaskDetailModal` and milestone views.
6. **Search & Category Filtering**: Live query search and multi-criteria category filter pills.

---

## 2. File Architecture

```
apps/web/src/
├── lib/
│   └── calendarUtils.ts            # Date arithmetic, calendar grid matrices, urgency calculations
├── components/
│   └── workspace/
│       ├── WorkspaceCalendar.tsx   # Comprehensive Research Calendar Command Center
│       ├── CalendarMonthGrid.tsx   # Month view grid with multi-day spanning bars and date cells
│       ├── CalendarWeekView.tsx    # Detailed weekly breakdown view
│       ├── CalendarListView.tsx    # Chronological agenda and deadline list view
│       └── CalendarSidebar.tsx     # Desktop Deadline Overview sidebar (Due Today, Due Soon, Overdue, Milestones)
└── tests/
    └── workspace-layout.test.tsx   # UI component unit and integration tests
```

---

## 3. UI/UX Design System & Tokens
- **Theme**: Deep obsidian glass aesthetic (`#07080F`, `#0D0E1A`, `#131424`) with clean borders (`border-slate-800/80`).
- **Typography**: Crisp high-contrast fonts (`text-slate-100`, `text-slate-300`, `text-violet-400`).
- **Status Badges**:
  - `Overdue`: `bg-rose-500/15 border-rose-500/30 text-rose-300`
  - `Due Today`: `bg-rose-500/20 border-rose-500/40 text-rose-200 animate-pulse`
  - `Due Soon`: `bg-amber-500/15 border-amber-500/30 text-amber-300`
  - `Upcoming`: `bg-indigo-500/15 border-indigo-500/30 text-indigo-300`
  - `Completed`: `bg-emerald-500/15 border-emerald-500/30 text-emerald-300`
  - `Milestone`: `bg-purple-500/20 border-purple-500/40 text-purple-200 font-bold`
