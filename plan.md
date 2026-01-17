# Mari Time Tracker — Implementation Plan

## Overview

Mari is a passive time-tracking menu bar app. Every 20 minutes (eventually adjustable), it prompts the user to confirm what they're working on. Users confirm, deny, or switch tasks. Time accumulates per task per day.

## Tech Stack

- Electron + electron-builder
- React + TypeScript
- SQLite via better-sqlite3
- Tray API for prompts
- Tailwind + shadcn/ui

## Data Model

**tasks**
| Column | Type | Notes |
|------------|---------|--------------------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL, UNIQUE |
| created_at | INTEGER | Unix timestamp |

**time_entries**
| Column | Type | Notes |
|----------|---------|--------------------------------|
| id | INTEGER | PK, autoincrement |
| task_id | INTEGER | FK → tasks.id, ON DELETE CASCADE |
| date | INTEGER | Unix timestamp (midnight) |
| duration | INTEGER | Seconds |

- UNIQUE(task_id, date) — one entry per task per day
- Confirm adds 900s via upsert: `ON CONFLICT(task_id, date) DO UPDATE SET duration = duration + 900`

## MVP Features

### 1. Interval Prompt (Tray)

Triggered automatically every 20 (adjustable in the future) minutes. Not user-activatable.

### 2. Activity Log (Menu Bar Click)

Opens via menu bar icon click. Shows today's tasks with durations.

- View all tasks and durations for selected day
- Edit duration inline (updates single row)
- Add manual time entry
- Delete entry
- Navigate between days

## Interval Prompt — Detailed Spec

### Design Principles

- **Auto-confirm by default** — Staying on task should require zero effort
- **Keyboard-first** — All actions available without mouse
- **Minimal, consistent UI** — Same position every time, no chrome
- **Fast dismiss** — Any action closes immediately

### Prompt Anatomy

- Task name (editable input to autocomplete to existing task, OR creating a new task)
- Two action buttons: Confirm / Deny

### Behavior Matrix

| State          | Action           | Result                                          |
| -------------- | ---------------- | ----------------------------------------------- |
| Returning user | Do nothing (10s) | Auto-confirm, +20 min, close                    |
| Returning user | Enter or click ✓ | Confirm immediately, +20 min, close             |
| Returning user | Esc or click ✗   | Deny, no entry, close                           |
| Returning user | Start typing     | Task switcher opens with autocomplete           |
| Returning user | Click task name  | Task switcher opens                             |
| New user       | —                | Empty input, no countdown, must type or dismiss |

### Keyboard Shortcuts

| Key                      | Action                                          |
| ------------------------ | ----------------------------------------------- |
| `Enter` or `Cmd + Enter` | Confirm immediately                             |
| `Esc` or `Cmd + Esc`     | Deny, close                                     |
| Any letter               | Opens task switcher with that letter pre-filled |
| `Tab`                    | Cycle through recent tasks (when switcher open) |

### Task Switcher

When user starts typing or clicks the task name:

- Input replaces task display
- Dropdown shows matching existing tasks (autocomplete)
- `Enter` after typing words that do not match any existing tasks creates a new task
- `Enter` on selected task switches to it and confirms
- `Esc` cancels and returns to countdown view

### Flow Summary

1. 20-minute timer fires
2. Prompt appears with last task + 10s countdown
3. User either:
   - Does nothing → Auto-confirms at countdown end
   - `Enter` → Confirms immediately
   - `Esc` → Denies, nothing recorded
   - Types → Opens task switcher
4. Entry upserts via `confirmTask(taskId)`
5. Prompt closes, timer resets

## Activity Log — Detailed Spec

### Behavior

- Opens on menu bar icon click
- Displays current day by default
- Navigate days via arrows or calendar picker

### Entry Display

- Each task shown with accumulated duration
- Duration is editable inline (click to edit)
- Delete button per entry

### Adding Entries

- "+" button opens form
- Select existing task or create new
- Enter duration manually
- Upserts via `createTimeEntry(taskId, date, duration)`

## Future Features

- Projects as parent entity to tasks
- Idle detection (subtract inactive time)
- Configurable prompt interval
- Suppress prompt during full-screen/screen share
- Export (Summary, Timesheet, Daily pivot)
- Invoice generation

## Export Formats (Future)

**Summary** — Totals for selected range
| task | duration |

**Timesheet** — Per day per task
| date | task | duration |

**Daily** — Pivot table
| task | 2026-01-01 | 2026-01-02 | ... |

## Prompt Lifecycle & Edge Cases

### Activity Log Suppression

- If activity log is open, suppress prompts entirely
- Track `lastPromptTime` timestamp
- On activity log close: if 15+ min elapsed since last prompt, prompt immediately
- User resolves missed time with a single confirm/deny/switch

### Prompt Window Rules

- Only one prompt window at a time; ignore interval if prompt already open
- Closing prompt via X or losing focus = implicit deny, no entry
- Disable confirm button immediately on click to prevent double-submit

### Sleep/Wake

- On wake, check elapsed time since last prompt
- If 15+ min passed, show prompt once
- Do not attempt to back-calculate missed intervals

### Data Integrity

- Prompt fetches `lastTask` fresh on open; if task was deleted, falls back to switcher mode
- All DB writes happen in main process; renderer only sends IPC
