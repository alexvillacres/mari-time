# IPC

Inter-process communication between main and renderer. All database access goes through IPC.

## Architecture

```
┌─────────────────┐     IPC      ┌─────────────────┐
│    Renderer     │ ◄──────────► │      Main       │
│  (React UI)     │   invoke/    │   (Node.js)     │
│                 │    handle    │                 │
└────────┬────────┘              └────────┬────────┘
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│    Preload      │              │    Database     │
│  (contextBridge)│              │    (SQLite)     │
└─────────────────┘              └─────────────────┘
```

## Preload Bridge

The preload script exposes a typed `window.api` object to the renderer via `contextBridge`.

```typescript
// Renderer calls
window.api.tasks.getAll()
window.api.timeEntries.create(taskId, date, duration)
window.api.settings.get('current_task_id')

// Which invokes
ipcRenderer.invoke('tasks:get-all')
ipcRenderer.invoke('time-entries:create', taskId, date, duration)
ipcRenderer.invoke('settings:get', 'current_task_id')
```

## Channel Naming

Convention: `domain:action`

- `tasks:*` — Task CRUD
- `time-entries:*` — Time entry operations
- `settings:*` — App settings (key-value)
- `window:*` — Window control
- `prompt:*` — Prompt window interactions

## Channels

### Tasks

| Channel           | Args                       | Returns             | Description                          |
| ----------------- | -------------------------- | ------------------- | ------------------------------------ |
| `tasks:get-all`   | —                          | `Task[]`            | All tasks, sorted by created_at DESC |
| `tasks:get-by-id` | `id: number`               | `Task \| undefined` | Single task                          |
| `tasks:create`    | `name: string`             | `Task`              | Create and return new task           |
| `tasks:update`    | `id: number, name: string` | `void`              | Update task name                     |
| `tasks:delete`    | `id: number`               | `void`              | Delete task (cascades to entries)    |

### Time Entries

| Channel                     | Args                         | Returns                  | Description                           |
| --------------------------- | ---------------------------- | ------------------------ | ------------------------------------- |
| `time-entries:get-all`      | —                            | `TimeEntry[]`            | All entries                           |
| `time-entries:get-by-id`    | `id: number`                 | `TimeEntry \| undefined` | Single entry                          |
| `time-entries:get-by-day`   | `date: string`               | `TimeEntry[]`            | Entries for YYYY-MM-DD                |
| `time-entries:get-by-week`  | `date: string`               | `TimeEntry[]`            | Entries for week starting at date     |
| `time-entries:get-by-month` | `date: string`               | `TimeEntry[]`            | Entries for month of date             |
| `time-entries:create`       | `taskId, date, duration`     | `TimeEntry`              | Create or upsert entry                |
| `time-entries:update`       | `id, taskId, date, duration` | `void`                   | Update entry                          |
| `time-entries:delete`       | `id: number`                 | `void`                   | Delete entry                          |
| `time-entries:confirm-task` | `taskId: number`             | `TimeEntry`              | Add 20 min to task for today (upsert) |

### Settings

| Channel        | Args                      | Returns       | Description       |
| -------------- | ------------------------- | ------------- | ----------------- |
| `settings:get` | `key: string`             | `any \| null` | Get setting value |
| `settings:set` | `key: string, value: any` | `void`        | Set setting value |

### Window

| Channel         | Args             | Returns | Description                             |
| --------------- | ---------------- | ------- | --------------------------------------- |
| `window:resize` | `height: number` | `void`  | Resize current window (clamped 100-500) |
| `window:close`  | —                | `void`  | Hide current window                     |

### Prompt

| Channel            | Args              | Returns       | Description                    |
| ------------------ | ----------------- | ------------- | ------------------------------ |
| `prompt:resolve`   | `action, taskId?` | `void`        | Handle prompt response         |
| `prompt:get-state` | —                 | `PromptState` | Get current task and task list |

**Prompt actions:**

- `confirm` — Log time to current task
- `deny` — Skip this interval
- `switch` — Log time to specified taskId

## Types

```typescript
interface Task {
  id: number
  name: string
  created_at: number
}

interface TimeEntry {
  id: number
  task_id: number
  date: number // Midnight timestamp
  duration: number // Seconds
}

interface PromptState {
  currentTaskId: number | null
  tasks: Task[]
}
```

## Date Handling

Renderer sends dates as `YYYY-MM-DD` strings. Main process converts to midnight unix timestamps before database operations.

```typescript
// Renderer
window.api.timeEntries.getByDay('2024-01-15')

// Main (handler)
function dateStringToTimestamp(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  return Math.floor(date.getTime() / 1000)
}
```

## Error Handling

IPC handlers should catch errors and either:

1. Return `undefined`/`null` for "not found" cases
2. Throw for actual errors (renderer receives rejection)

```typescript
// Main
ipcMain.handle('tasks:create', async (_, name: string) => {
  try {
    return db.createTask(name)
  } catch (error) {
    console.error('[IPC] tasks:create error:', error)
    throw error // Renderer gets Promise rejection
  }
})

// Renderer
try {
  const task = await window.api.tasks.create(name)
} catch (error) {
  // Handle error in UI
}
```

## Type Safety

Types are defined in `src/preload/index.d.ts` and augment the global `Window` interface:

```typescript
declare global {
  interface Window {
    api: {
      tasks: { ... }
      timeEntries: { ... }
      settings: { ... }
      window: { ... }
      prompt: { ... }
    }
  }
}
```

This provides full TypeScript support in the renderer without importing from preload.
