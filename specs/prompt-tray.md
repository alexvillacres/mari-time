# Prompt & Tray

The core interaction loop. Every 20 minutes, Mari asks what you're working on. Silence confirms. Switching is the exception.

## Interval Timer

- **Frequency**: 20 minutes
- **Location**: Main process (`setInterval`)
- **Starts**: On app launch
- **Resets**: After each prompt resolution (confirm, deny, or switch)

## Prompt Window

Separate from the activity log. Small, focused, appears automatically when the timer fires.

### Layout

```
┌─────────────────────────────┐
│  What are you working on?   │
│                             │
│  ● Current Task Name        │  ← highlighted, pre-selected
│    Other Task               │
│    Another Task             │
│                             │
│  [ + New task input ]       │
└─────────────────────────────┘
```

- Shows all tasks, current task highlighted at top
- "Current task" = last confirmed task (persisted in memory or DB)
- Input field at bottom for creating new task inline

### Resolution States

| Action                | Result               | Time Logged         |
| --------------------- | -------------------- | ------------------- |
| Ignore (timeout)      | Confirm current task | +20 min to current  |
| Blur (click outside)  | Confirm current task | +20 min to current  |
| Cmd+Enter             | Confirm current task | +20 min to current  |
| Esc                   | Deny                 | Nothing logged      |
| Select different task | Switch               | +20 min to selected |
| Type new task + Enter | Switch               | +20 min to new task |

### Timeout Behavior

- Prompt auto-dismisses after 10 seconds
- Counts as confirmation of current task
- No stacking — if a prompt is ignored, next one appears in 20 min

## Keyboard Shortcuts

Only active when prompt window is focused:

| Key         | Action                     |
| ----------- | -------------------------- |
| `Cmd+Enter` | Confirm current task       |
| `Esc`       | Deny (no time logged)      |
| `↑` / `↓`   | Navigate task list         |
| `Enter`     | Confirm selected task      |
| Type        | Filter tasks or create new |

## Tray

- **Click**: Opens activity log window (not prompt)
- **No right-click menu** for now

## Suppression Rules

Prompt does NOT appear when:

1. **Fullscreen app is active** — User is presenting, gaming, or in focus mode
2. **Do Not Disturb is enabled** — System-level signal to not interrupt
3. **Screen sharing is active** — Don't pop up during calls
4. **Activity log is open** — User is already managing their time

When suppressed, the interval still ticks. If a current task exists, time is auto-confirmed to it (silence is confirmation). If no current task, nothing is logged. Timer resets normally.

## Window Config

| Property        | Value                        |
| --------------- | ---------------------------- |
| Size            | ~300x250 (content-dependent) |
| Frame           | None                         |
| Position        | Top-right of primary display |
| Always on top   | Yes                          |
| Show in taskbar | No                           |
| Resizable       | No                           |

## State: Current Task

The prompt needs to know what "current task" means:

- Persisted in `settings` table as `current_task_id` (survives app restart)
- Updated whenever a task is confirmed or switched
- If no current task (first launch), prompt shows task list with none pre-selected
- First confirmation sets the current task
- Esc (deny) does NOT clear current task — just skips logging for this interval

## Edge Cases

**No tasks exist**: Prompt shows only the new task input. User must create one.

**App just launched**: No current task. First prompt has no pre-selection.

**User quits during prompt**: Treat as deny. No time logged.

**Multiple displays**: Prompt appears on primary display only.
