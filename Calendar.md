# ResearchOS — Research Calendar Module

## 1. Overview

The **Research Calendar Module** in ResearchOS should provide a visual way for researchers to understand their:

* Tasks
* Milestones
* Deadlines
* Research activities
* Progress
* Upcoming work
* Overdue work

The calendar should not behave like a generic calendar. It should act as a:

> **Research Calendar + Deadline Tracker + Milestone Visualization + Progress Overview**

The primary goal is that a researcher can open the calendar and understand within a few seconds:

* What do I need to do today?
* What deadline is coming next?
* What is overdue?
* What are my major research milestones?
* How much progress has been made?

---

# 2. Core Design Principle

The Calendar should be the **visual companion of the existing Milestone module**.

Do not create an independent milestone/task system only for the calendar.

The calendar should consume the existing ResearchOS project data and visually represent it.

Each calendar item should ideally show:

* Task/Milestone name
* Type
* Status
* Deadline
* Progress
* Priority
* Duration
* Related milestone

---

# 3. Recommended Desktop Layout

Use a layout similar to:

```text
┌───────────────────────────────────────────────────────────────┐
│ Research Calendar                         October 2026        │
│                                                               │
│  < Previous       October 2026       Next >      Today        │
├───────────────────────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri    Sat    Sun                │
├───────────────────────────────────────────────────────────────┤
│ 28     29     30      1      2      3      4                 │
│                     ● Literature Review                      │
│                                                               │
│  5      6      7      8      9     10     11                 │
│  ●             ●      🔴                                     │
│ Dataset        Analysis  Proposal                             │
│ Collection              Deadline                              │
│                                                               │
│ 12     13     14     15     16     17     18                 │
│       ────────────────────                                    │
│       Experiment Phase                                        │
│                                                               │
│ 19     20     21     22     23     24     25                 │
│                         🔴                                    │
│                      Paper Draft                              │
│                      Due Today                                │
│                                                               │
│ 26     27     28     29     30     31                        │
│                         ◆                                     │
│                     Submission                                │
└───────────────────────────────────────────────────────────────┘


┌──────────────────────────┐
│ 🔴 Due Today             │
├──────────────────────────┤
│ Paper Draft              │
│ Literature Review        │
│                          │
│ Deadline: Oct 23         │
│ Progress: ████████░░ 80% │
│                          │
│ [ Open Milestone → ]     │
└──────────────────────────┘
```

Recommended desktop proportions:

```text
Calendar: 70–75%
Sidebar: 25–30%
```

---

# 4. Page Structure

The page should contain:

```text
Research Calendar
│
├── Header
│   ├── Page title
│   ├── Current month
│   ├── Previous button
│   ├── Next button
│   └── Today button
│
├── Calendar Toolbar
│   ├── Month / Week / List view
│   ├── Search
│   └── Filter
│
├── Main Calendar
│   ├── Weekday header
│   ├── Date cells
│   ├── Tasks
│   ├── Milestones
│   ├── Deadline indicators
│   └── Multi-day activities
│
└── Deadline Summary Sidebar
    ├── Due Today
    ├── Due Soon
    ├── Overdue
    └── Upcoming Milestones
```

---

# 5. Calendar Header

Use a clean header:

```text
┌──────────────────────────────────────────────────────────────┐
│ Research Calendar                              October 2026  │
│                                                              │
│ < Previous       October 2026       Next >       Today       │
└──────────────────────────────────────────────────────────────┘
```

### Controls

### Previous

Navigate to the previous month.

### Next

Navigate to the next month.

### Today

Return immediately to the current date.

---

# 6. Calendar View Modes

Provide three view modes:

```text
[ Month ] [ Week ] [ List ]
```

## Month View

Default view.

Best for:

* Overall research planning
* Deadlines
* Milestone dates
* Project timeline

## Week View

Best for:

* Detailed daily planning
* Multiple tasks on the same day
* Short-term research activities

## List View

Best for:

* Upcoming deadlines
* Overdue tasks
* Milestones

Example:

```text
Upcoming Deadlines

Oct 23   🔴 Paper Draft
Oct 27   🟡 Experiment Results
Oct 30   ◆ Final Submission
Nov 04   🔵 Conference Presentation
```

---

# 7. Calendar Grid

Use a standard 7-column calendar:

```text
Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday
```

Each date should be visually separated.

Example:

```text
┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│ Mon    │ Tue    │ Wed    │ Thu    │ Fri    │ Sat    │ Sun    │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ 28     │ 29     │ 30     │ 1      │ 2      │ 3      │ 4      │
│        │        │        │ Review │        │        │        │
│        │        │        │        │        │        │        │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ 5      │ 6      │ 7      │ 8      │ 9      │ 10     │ 11     │
│ Dataset│        │Analysis│🔴      │        │        │        │
│        │        │        │Proposal│        │        │        │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

---

# 8. Date Cell Design

Each date cell should contain:

```text
┌─────────────────────┐
│ 23                  │
│                     │
│ 🔴 Paper Draft      │
│                     │
│ ████████░░ 80%      │
└─────────────────────┘
```

The date number should be clearly visible.

The current day should have a subtle but noticeable visual highlight.

---

# 9. Task and Event Visualization

Different types of calendar items should be visually distinguishable.

## Normal Task

```text
● Literature Review
```

## In Progress

```text
● Dataset Collection
██████░░░░ 60%
```

## Completed

```text
✓ Literature Review
```

## Upcoming Deadline

```text
🔵 Paper Draft
```

## Due Soon

```text
🟡 Paper Draft
```

## Due Today

```text
🔴 Paper Draft
```

## Overdue

```text
🔴 OVERDUE
Paper Draft
```

## Major Milestone

Use a diamond:

```text
◆ Final Submission
```

The diamond should visually distinguish milestones from normal tasks.

---

# 10. Status System

Use a consistent status system throughout ResearchOS.

| Indicator          | Meaning                |
| ------------------ | ---------------------- |
| 🔵                 | Upcoming               |
| 🟡                 | Due Soon               |
| 🔴                 | Due Today              |
| 🔴 + Overdue label | Overdue                |
| 🟢 / ✓             | Completed              |
| ◆                  | Major Milestone        |
| ●                  | Normal Task / Activity |

### Accessibility Requirement

Do not rely only on color.

Use:

* Icon
* Label
* Text
* Subtle color

together.

---

# 11. Deadline Logic

Deadline urgency should be calculated automatically.

Suggested logic:

```text
Completed
    ↓
No urgency indicator

More than 7 days remaining
    ↓
🔵 Upcoming

3–7 days remaining
    ↓
🟡 Due Soon

0–2 days remaining
    ↓
🔴 Urgent

Due today
    ↓
🔴 Due Today

Past deadline + incomplete
    ↓
🔴 Overdue
```

Keep this logic centralized so it can be changed later.

---

# 12. Deadline Summary Sidebar

On desktop, provide a right-side summary panel.

Example:

```text
┌──────────────────────────────┐
│ DEADLINE OVERVIEW             │
├──────────────────────────────┤
│                              │
│ 🔴 Due Today                 │
│                              │
│ Paper Draft                  │
│ Literature Review            │
│                              │
│ Deadline: Oct 23             │
│ Progress: ████████░░ 80%     │
│                              │
│ [ Open Milestone → ]         │
│                              │
├──────────────────────────────┤
│ 🟡 Due Soon                  │
│                              │
│ Experiment Results           │
│ Due in 4 days                │
│                              │
├──────────────────────────────┤
│ 🔵 Upcoming                  │
│                              │
│ Final Submission             │
│ Oct 30                       │
│                              │
└──────────────────────────────┘
```

---

# 13. Sidebar Sections

The sidebar should preferably contain four sections.

## Due Today

Show tasks/milestones whose deadline is today.

```text
🔴 Due Today

Paper Draft
Progress: 80%
Deadline: Oct 23
```

## Due Soon

Show approaching deadlines.

```text
🟡 Due Soon

Experiment Results
Due in 4 days
```

## Overdue

Show incomplete tasks whose deadline has passed.

```text
🔴 Overdue

Literature Review
2 days overdue
```

## Upcoming Milestones

Show major project checkpoints.

```text
◆ Upcoming Milestones

Experiment Complete
Oct 27

Final Submission
Oct 30
```

---

# 14. Deadline Detail Card / Modal

Clicking a deadline should open a detail card or modal.

Example:

```text
┌────────────────────────────────────┐
│ 🔴 Paper Draft                     │
├────────────────────────────────────┤
│                                    │
│ Type        Milestone              │
│ Project     AI Research Project    │
│ Deadline    October 23, 2026       │
│ Time        11:59 PM               │
│                                    │
│ Progress                            │
│ ████████░░ 80%                     │
│                                    │
│ Status      In Progress            │
│ Priority    High                   │
│                                    │
│ Tasks                              │
│ ✓ Literature Review                │
│ ✓ Methodology                      │
│ ● Results                          │
│ ○ Discussion                       │
│                                    │
│ [ Open Milestone ] [ Edit ]        │
└────────────────────────────────────┘
```

---

# 15. Calendar ↔ Milestone Integration

The Calendar and Milestone modules must be connected.

When the user clicks:

```text
[ Open Milestone → ]
```

navigate to the corresponding existing milestone detail page.

Flow:

```text
Calendar
    ↓
Paper Draft
    ↓
Open Milestone
    ↓
Milestone Detail
```

Do not duplicate milestone data specifically for the calendar.

---

# 16. Multi-Day Activities

Research activities frequently span multiple days.

The calendar should support multi-day events.

Example:

```text
12        13        14        15        16        17        18

          ┌─────────────────────────────────┐
          │ Experiment Phase                │
          └─────────────────────────────────┘
```

Another example:

```text
Dataset Collection
Oct 5 → Oct 8

████████████████████████
```

The event should visually stretch across its duration.

If the event crosses into another calendar week, it should continue on the next row.

---

# 17. Multi-Day Event States

### In Progress

```text
● Dataset Collection
██████░░░░ 60%
```

### Completed

```text
✓ Dataset Collection
```

### Overdue

```text
🔴 Dataset Collection
OVERDUE
```

---

# 18. Milestone Visualization

Milestones represent major research checkpoints.

Examples:

```text
◆ Research Proposal Approved
◆ Dataset Ready
◆ Experiment Complete
◆ Paper Draft Complete
◆ Final Submission
```

Milestones should have stronger visual hierarchy than normal tasks.

Example:

```text
        ◆
   Final Submission
       Oct 30
```

Use a diamond icon and stronger typography.

---

# 19. Reference Calendar Design

Use this as the primary visual reference:

```text
┌───────────────────────────────────────────────────────────────┐
│ Research Calendar                         October 2026        │
│                                                               │
│ < Previous       October 2026       Next >      Today         │
├───────────────────────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri    Sat    Sun                │
├───────────────────────────────────────────────────────────────┤
│ 28     29     30      1      2      3      4                 │
│                     ● Literature Review                      │
│                                                               │
│  5      6      7      8      9     10     11                 │
│  ●             ●      🔴                                     │
│ Dataset        Analysis  Proposal                             │
│ Collection              Deadline                              │
│                                                               │
│ 12     13     14     15     16     17     18                 │
│       ────────────────────                                    │
│       Experiment Phase                                        │
│                                                               │
│ 19     20     21     22     23     24     25                 │
│                         🔴                                    │
│                      Paper Draft                              │
│                      Due Today                                │
│                                                               │
│ 26     27     28     29     30     31                        │
│                         ◆                                     │
│                     Submission                                │
└───────────────────────────────────────────────────────────────┘


┌──────────────────────────┐
│ 🔴 Due Today             │
├──────────────────────────┤
│ Paper Draft              │
│ Literature Review        │
│                          │
│ Deadline: Oct 23         │
│ Progress: ████████░░ 80% │
│                          │
│ [ Open Milestone → ]     │
└──────────────────────────┘
```

---

# 20. User Interactions

## Clicking a Date

Clicking an empty date should provide:

```text
+ Add Task
+ Add Milestone
+ Add Event
```

If the date already contains events:

```text
October 23

🔴 Paper Draft
🟡 Experiment Results

+ Add Task
```

---

## Clicking a Task

Open the task detail view.

---

## Clicking a Milestone

Open the existing milestone detail view.

---

## Hover Behavior

On desktop, hovering over an event can show a compact preview:

```text
Paper Draft

Deadline: Oct 23
Progress: 80%
Status: In Progress

Click to view
```

Keep the tooltip compact and avoid oversized popovers.

---

# 21. Search

Provide calendar search:

```text
🔍 Search calendar...
```

Example:

```text
Search: paper
```

Results:

```text
Paper Draft
Paper Revision
Final Paper Submission
```

Search should work across:

* Task names
* Milestone names
* Project names
* Tags, if available

---

# 22. Filter System

Provide a filter control.

Example:

```text
Filter

☑ Tasks
☑ Milestones
☑ Deadlines
☐ Completed
☑ Overdue
```

Future filters can include:

```text
Project
Researcher
Priority
Status
Tag
```

---

# 23. Responsive Design

## Desktop

Use:

```text
Calendar: 70–75%
Sidebar: 25–30%
```

Example:

```text
┌───────────────────────────────┬──────────────────────┐
│                               │                      │
│          CALENDAR             │     DEADLINES        │
│                               │                      │
│                               │     Due Today        │
│                               │     Due Soon         │
│                               │     Upcoming         │
│                               │                      │
└───────────────────────────────┴──────────────────────┘
```

## Tablet

The sidebar can become a collapsible drawer.

## Mobile

Use a full-width calendar.

```text
October 2026

<              >

Mon Tue Wed Thu Fri Sat Sun

        1   2   3   4
        ●
        Review

5   6   7   8   9   10  11
●           🔴
Dataset     Proposal
```

The deadline summary should move below the calendar or become a bottom sheet.

Example:

```text
┌────────────────────────────┐
│ 🔴 Due Today               │
├────────────────────────────┤
│ Paper Draft                │
│ 80% complete               │
│                            │
│ [Open Milestone →]         │
└────────────────────────────┘
```

Avoid horizontal scrolling.

---

# 24. Visual Design Direction

The ResearchOS Calendar should feel:

* Professional
* Clean
* Academic
* Modern
* Minimal
* Data-oriented
* Calm
* Easy to scan

Avoid:

* Excessive gradients
* Excessive shadows
* Too many colors
* Huge cards
* Excessive animations
* Emoji-heavy UI
* Visually noisy calendar cells

Use the existing ResearchOS design system wherever possible.

---

# 25. Color Strategy

The base calendar should remain mostly neutral.

Use colors primarily to communicate status.

```text
Blue   → Upcoming
Yellow → Due Soon
Red    → Due Today / Overdue
Green  → Completed
```

Do not color entire calendar cells unnecessarily.

Use subtle status indicators instead.

The interface must remain understandable without color by using:

* Icons
* Labels
* Typography
* Status text

---

# 26. Current Day

The current date should have a subtle visual highlight.

Example:

```text
┌───────────────┐
│ 23  TODAY     │
│               │
│ 🔴 Paper Draft│
└───────────────┘
```

The Today indicator should be noticeable but should not overpower the actual calendar events.

---

# 27. Overdue State

Overdue tasks must be very clear.

Example:

```text
🔴 OVERDUE

Paper Revision
Due: Oct 18
3 days overdue

Progress:
██████░░░░ 60%
```

Overdue tasks should:

1. Appear in the calendar.
2. Appear in the Overdue sidebar section.
3. Clearly display the overdue state.
4. Remain linked to their original milestone/task.

---

# 28. Empty States

## No Activities

```text
┌────────────────────────────────────┐
│                                    │
│               📅                   │
│                                    │
│      No research activities        │
│      scheduled for this month.     │
│                                    │
│          [ + Add Task ]            │
│                                    │
└────────────────────────────────────┘
```

## No Upcoming Deadlines

```text
✓ No upcoming deadlines

You're all caught up.
```

---

# 29. Data Relationship

The Calendar should not maintain an independent task/milestone database.

Conceptually:

```text
Project
   │
   ├── Milestones
   │      │
   │      ├── startDate
   │      ├── dueDate
   │      ├── status
   │      ├── progress
   │      └── priority
   │
   └── Tasks
          │
          ├── startDate
          ├── dueDate
          ├── status
          ├── progress
          └── milestoneId
```

The Calendar reads this existing data and converts it into calendar events.

---

# 30. Important UX Questions the Calendar Must Answer

The calendar should allow the researcher to answer these questions immediately.

### What do I need to do today?

```text
🔴 Due Today
```

### What is coming next?

```text
🟡 Due Soon
🔵 Upcoming
```

### What have I missed?

```text
🔴 Overdue
```

### What are my major research checkpoints?

```text
◆ Milestones
```

### How much progress have I made?

```text
████████░░ 80%
```

---

# 31. Recommended Final Desktop Experience

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Research Calendar                                  October 2026    │
│                                                                     │
│ < Previous      October 2026       Next >       Today              │
│                                                                     │
│ [ Month ] [ Week ] [ List ]                🔍 Search   Filter       │
├───────────────────────────────────────────────────┬─────────────────┤
│                                                   │                 │
│ MON   TUE   WED   THU   FRI   SAT   SUN          │ DEADLINE        │
│                                                   │ OVERVIEW        │
│ 28    29    30     1     2     3     4           │                 │
│                    ● Literature Review             │ 🔴 Due Today   │
│                                                   │                 │
│  5     6     7     8     9    10    11           │ Paper Draft     │
│  ●          ●     🔴                           │ 80%             │
│ Dataset   Analysis Proposal                       │ Oct 23          │
│ Collection        Deadline                        │                 │
│                                                   │ [Open Milestone]│
│ 12    13    14    15    16    17    18           │                 │
│      ─────────────────────────                     │ 🟡 Due Soon    │
│      Experiment Phase                              │                 │
│                                                   │ Experiment       │
│ 19    20    21    22    23    24    25           │ Results         │
│                          🔴                       │ 4 days left     │
│                       Paper Draft                  │                 │
│                       Due Today                    │                 │
│                                                   │ ◆ Milestones    │
│ 26    27    28    29    30    31                 │                 │
│                          ◆                        │ Final Submission│
│                      Submission                    │ Oct 30          │
│                                                   │                 │
└───────────────────────────────────────────────────┴─────────────────┘
```

---

# 32. Implementation Priority

Implement in the following order.

## Phase 1 — Core Calendar

* Monthly calendar
* Previous / Next
* Today button
* Current date
* Tasks
* Milestones
* Deadline indicators
* Completed state
* Overdue state

## Phase 2 — Research-specific UX

* Multi-day events
* Progress indicators
* Deadline sidebar
* Milestone linking
* Task detail modal
* Milestone detail navigation

## Phase 3 — Advanced Features

* Week view
* List view
* Search
* Filters
* Drag-and-drop scheduling
* Calendar export
* External calendar integration

Do not overcomplicate Phase 1.

---

# 33. Important Implementation Instructions for Antigravity

Before implementing the Calendar:

1. Inspect the existing ResearchOS project structure.
2. Identify the existing Milestone data model.
3. Identify the existing Task/Event components.
4. Identify the existing design system.
5. Reuse existing typography, spacing, colors and UI components.
6. Do not create a separate visual language for the Calendar.
7. Reuse existing navigation and routing.
8. Reuse existing modal/drawer components.
9. Reuse the existing icon system.
10. Make the Calendar fully responsive.
11. Make the Calendar data-driven.
12. Do not hard-code the October 2026 example.
13. Connect calendar events to the existing task/milestone records.
14. Do not create duplicate task or milestone records for calendar purposes.
15. Preserve the existing ResearchOS functionality while adding this module.

The October 2026 examples in this document are **visual/reference examples only**.

---

# 34. Success Criteria

The implementation is successful if a researcher can open the Calendar and immediately understand:

```text
TODAY
  ↓
What do I need to do?

UPCOMING
  ↓
What deadline is approaching?

OVERDUE
  ↓
What have I missed?

MILESTONES
  ↓
What are my major research checkpoints?

PROGRESS
  ↓
How much of my work is complete?
```

The final experience should feel like a:

> **Research Project Command Center**

rather than a generic Google Calendar clone.

The Calendar should make research planning, milestone tracking, and deadline awareness visually obvious with minimal cognitive effort.
