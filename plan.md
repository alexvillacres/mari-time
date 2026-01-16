# Mari Time Tracker — Implementation Plan

## Overview

Mari is a passive time-tracking menu bar app. Every 15 minutes, it prompts the user to confirm what they're working on. Users confirm, deny, or switch tasks. Time accumulates per task per day.

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

Triggered automatically every 15 minutes. Not user-activatable.

- **New user**: Empty input to type a task name
- **Returning user**: Input pre-filled with most recent task
- **Actions**:
  - Confirm → Adds 15 min to task for today, closes tray
  - Deny → Closes tray, no entry recorded
  - New task → Type new name or select from dropdown (autocomplete from existing tasks)

### 2. Activity Log (Menu Bar Click)

Opens via menu bar icon click. Shows today's tasks with durations.

- View all tasks and durations for selected day
- Edit duration inline (updates single row)
- Add manual time entry
- Delete entry
- Navigate between days

## User Flows

### Interval Prompt Flow

1. 15-minute timer fires
2. Tray window appears with input (pre-filled if returning user)
3. User confirms, denies, or enters new task
4. On confirm: `confirmTask(taskId)` upserts 900s to today's entry
5. Tray closes

### Manual Edit Flow

1. User clicks menu bar icon
2. Activity log shows today's tasks + durations
3. User clicks duration to edit, or clicks + to add entry
4. Changes persist immediately via `updateTimeEntryDuration(id, duration)`

## Future Features

- Projects as parent entity to tasks
- Idle detection (subtract inactive time)
- Configurable prompt interval
- Export (Summary, Timesheet, Daily pivot)
- Invoice generation

## Export Formats (Future)

**Summary** — Totals for selected range
| task | duration |

**Timesheet** — Per day per task
| date | task | duration |

**Daily** — Pivot table
| task | 2026-01-01 | 2026-01-02 | ... |
