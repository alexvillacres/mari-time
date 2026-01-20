# Main Process

The orchestrator. Runs in Node.js, manages app lifecycle, windows, tray, timer, and database access.

## File Structure

```
src/main/
├── index.ts      # Entry point, lifecycle, IPC handlers
└── database.ts   # SQLite operations
```

## App Lifecycle

### Startup Sequence

```
app.whenReady()
    │
    ├── Set app user model ID
    ├── Initialize database (create tables if needed)
    ├── Register IPC handlers
    ├── Create tray icon
    ├── Create activity log window (hidden)
    ├── Create prompt window (hidden)
    ├── Load current_task_id from settings
    └── Start 20-minute interval timer
```

### Shutdown

- **macOS** (MVP): App stays alive when windows closed (menu bar app pattern). Quit via Cmd+Q or tray.

## Interval Timer

Core of the time tracking system.

```typescript
let intervalId: NodeJS.Timeout | null = null

function startTimer(): void {
  intervalId = setInterval(
    () => {
      handleInterval()
    },
    20 * 60 * 1000
  ) // 20 minutes
}

function handleInterval(): void {
  if (shouldSuppress()) {
    // Suppressed — auto-confirm if current task exists
    if (currentTaskId) {
      db.confirmTask(currentTaskId)
    }
    return
  }

  showPromptWindow()
}
```

### Suppression Checks

```typescript
function shouldSuppress(): boolean {
  return (
    isFullscreenAppActive() ||
    isDoNotDisturbEnabled() ||
    isScreenSharing() ||
    isActivityLogVisible()
  )
}
```

**Platform APIs:**

- Fullscreen: `screen.getPrimaryDisplay()` + window bounds comparison, or use `powerMonitor` events
- DND (macOS): `systemPreferences.getUserDefault('com.apple.notificationcenterui', 'dnd_enabled')`
- Screen sharing: Check for active screen capture sessions

## Tray

- **Icon**: 22px on macOS, 16px on Windows/Linux
- **Tooltip**: "Mari"
- **Click**: Toggle activity log window visibility
- **No context menu** (for now)

## State Management

### Current Task

```typescript
let currentTaskId: number | null = null

// On startup
currentTaskId = db.getSetting('current_task_id')

// On confirm/switch
function setCurrentTask(taskId: number): void {
  currentTaskId = taskId
  db.setSetting('current_task_id', taskId)
}
```

### Window References

```typescript
let tray: Tray | null = null
let activityLogWindow: BrowserWindow | null = null
let promptWindow: BrowserWindow | null = null
```

## IPC Handlers

Registered in `app.whenReady()`. All database operations go through IPC.

See [ipc.md](./ipc.md) for full channel list.

Key handlers:

- `tasks:*` — CRUD for tasks
- `time-entries:*` — CRUD for time entries
- `settings:*` — Get/set app settings
- `window:*` — Window control (resize, close)
- `prompt:*` — Prompt responses (confirm, deny, switch)

## Window Management

### Activity Log Window

- Created on startup, hidden
- Shown/hidden via tray click
- Hides on blur
- See [windows.md](./windows.md) for config

### Prompt Window

- Created on startup, hidden
- Shown by interval timer (unless suppressed)
- Auto-hides after 10 seconds (timeout = confirm)
- Hides on blur (blur = confirm)
- See [windows.md](./windows.md) for config

### Communication Flow

```
Timer fires
    │
    ├── Check suppression → if suppressed, auto-confirm and return
    │
    └── Show prompt window
            │
            ├── User ignores (timeout) → confirm current task
            ├── User clicks outside (blur) → confirm current task
            ├── User presses Cmd+Enter → confirm current task
            ├── User presses Esc → deny (no time logged)
            └── User selects task → switch to that task
                    │
                    └── IPC: prompt:resolve { action, taskId? }
                            │
                            └── Main process handles resolution
                                    │
                                    ├── Log time if needed
                                    ├── Update current_task_id
                                    └── Hide prompt window
```

## Error Handling

- Database errors: Log and continue. Don't crash the app.
- Window creation errors: Log, attempt recreation on next trigger.
- IPC errors: Return error to renderer, let UI handle display.

## Logging

Use `console.log` with prefixes for debugging:

- `[DB]` — Database operations
- `[IPC]` — IPC handler calls
- `[Timer]` — Interval events
- `[Window]` — Window show/hide/create

## Future Considerations

- **Auto-launch**: Start on system boot (electron-settings or platform-specific)
- **Global shortcuts**: Register hotkeys to show activity log from anywhere
- **Idle detection** (v2): Pause timer when system is idle (powerMonitor)
- **Windows/Linux support**: Handle platform-specific shutdown behavior
