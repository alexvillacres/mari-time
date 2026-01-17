# Activity Log

The "editor" view. Shows time entries for a given day, allows manual corrections and additions.

## Window

Separate from prompt window. Opened via tray click.

| Property | Value |
|----------|-------|
| Size | 400x300 (resizable) |
| Frame | None |
| Position | Top-right of primary display |
| Always on top | Yes |
| Show in taskbar | No |

Closes on blur (click outside).

## Layout

```
┌──────────────────────────────────────┐
│  < >  Today                   4h 30m │  ← date nav + total
│                                      │
│  Development ████████████     2h 15m │  ← entries with proportion bars
│  Meetings    ██████            1h 0m │
│  Email       ████               45m  │
│  Admin       ██                 30m  │
│                                      │
│                        [ Add entry + ]│
└──────────────────────────────────────┘
```

## Date Navigation

- **Left arrow**: Previous day
- **Right arrow**: Next day (disabled if already on today)
- **Header**: Shows "Today", "Yesterday", or formatted date (e.g., "Mon, Jan 15")

## Entry List

### Display

- Sorted alphabetically by task name
- Each row: task name (left), duration (right)
- Proportion bar below each entry — width relative to total time that day
- Empty state: "No entries for this day"

### Inline Editing

Both task name and duration are editable via click:

| Field | Click | Edit behavior |
|-------|-------|---------------|
| Task name | Opens text input | Type new name, auto-creates task if needed |
| Duration | Opens text input | Flexible parsing (see below) |

**Save triggers**: Enter, blur (click outside input)
**Cancel trigger**: Esc

### Duration Parsing

Accepts multiple formats, all case-insensitive:

| Input | Interpreted as |
|-------|----------------|
| `1h 30m` | 1 hour 30 minutes |
| `1h30m` | 1 hour 30 minutes |
| `2h` | 2 hours |
| `45m` | 45 minutes |
| `1:30` | 1 hour 30 minutes |
| `90` | 90 minutes (plain number = minutes) |
| `1.5h` | 1 hour 30 minutes |
| `0` or `0m` | Removes entry for this day |

### Duration Display

- Format: `Xh Ym` (e.g., "2h 15m")
- If hours = 0: just show minutes ("45m")
- If minutes = 0: just show hours ("2h")

## Add Entry

Button at bottom right opens inline form:

```
┌──────────────────────────────────────┐
│  [Task name...          ] [  0m   ]  │
└──────────────────────────────────────┘
```

- Task input auto-focuses
- Enter submits (if task name provided)
- Esc cancels
- Blur submits
- If task name matches existing task (case-insensitive), uses that task
- If no match, creates new task
- After creation with empty duration, auto-focuses duration field for editing

## Proportion Bars

Visual indicator below each entry showing relative time spent.

- Width = (entry duration / total day duration) × 100%
- Color: `green-400` at 60% opacity
- Minimum visible width for any non-zero entry (so 5 minutes doesn't disappear)

## Prompt Suppression

When the activity log window is visible, prompts are suppressed. User is already managing their time — no need to interrupt.

## Keyboard Shortcuts

When activity log is focused:

| Key | Action |
|-----|--------|
| `←` | Previous day |
| `→` | Next day |
| `Esc` | Close window |

When editing:

| Key | Action |
|-----|--------|
| `Enter` | Save edit |
| `Esc` | Cancel edit |
| `Tab` | Move to next field (task → duration → next entry's task) |
| `Shift+Tab` | Move to previous field |

## Future Considerations

- **Week view**: Summary of daily totals, expandable to see breakdown
- **Month view**: Calendar-style grid with daily totals, click to drill into day
- **Export**: CSV/JSON export for date range
