# Renderer

React 19 UI running in Electron's renderer process. Tailwind CSS v4 for styling.

## File Structure

```
src/renderer/src/
├── main.tsx                    # Entry point
├── App.tsx                     # View router
├── index.css                   # Tailwind imports
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── prompt.tsx              # Prompt view
│   ├── activity-log.tsx        # Activity log view
│   ├── time-entry-row.tsx      # Single entry row
│   └── add-entry-form.tsx      # New entry form
├── hooks/
│   ├── useTimeEntries.ts       # Time entry data + mutations
│   └── useInlineEdit.ts        # Inline editing state
├── utils/
│   └── duration.ts             # Duration parsing/formatting
├── types/
│   └── time-entries.ts         # TypeScript interfaces
└── lib/
    └── utils.ts                # cn() helper for Tailwind
```

## View Routing

App.tsx determines which view to render based on URL query param:

```typescript
function App(): React.JSX.Element {
  const view = new URLSearchParams(window.location.search).get('view')

  if (view === 'prompt') {
    return <Prompt />
  }

  return <ActivityLog />
}
```

Default to activity log if no param (backwards compatible with current implementation).

## Components

### Prompt

The interval prompt view. Shows task list, handles confirmation/denial.

**Props**: None (fetches own data)

**State**:
- `tasks: Task[]` — All available tasks
- `currentTaskId: number | null` — Pre-selected task
- `selectedTaskId: number | null` — User's current selection
- `newTaskName: string` — Input for creating new task

**Behavior**:
- On mount: Fetch tasks and current task from main process
- Arrow keys navigate task list
- Enter confirms selected task
- Cmd+Enter confirms current task (shortcut)
- Esc denies (no time logged)
- Typing filters tasks or starts new task creation

```typescript
function Prompt(): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    async function load() {
      const [tasksData, state] = await Promise.all([
        window.api.tasks.getAll(),
        window.api.prompt.getState()
      ])
      setTasks(tasksData)
      setCurrentTaskId(state.currentTaskId)
    }
    load()
  }, [])

  // Keyboard handling, task selection, etc.
}
```

### ActivityLog

Daily time entry view with inline editing.

**Props**:
- `selectedDate: string` — YYYY-MM-DD format
- `onEntriesChange?: () => void` — Callback when entries modified

**State**: Managed via `useTimeEntries` hook

### TimeEntryRow

Single entry row with inline editing for task name and duration.

**Props**:
- `entry: TimeEntryWithTask`
- `isEditingTaskName: boolean`
- `isEditingDuration: boolean`
- `editTaskName: string`
- `editDuration: string`
- `onEditTaskNameChange`, `onEditDurationChange`
- `onStartEditTaskName`, `onStartEditDuration`
- `onSaveTaskName`, `onSaveDuration`
- `onCancel`

### AddEntryForm

Inline form for creating new entries.

**Props**:
- `onSubmit: (taskName: string, duration: string) => void`
- `onCancel: () => void`
- `isEmpty: boolean` — Affects styling/positioning

## Hooks

### useTimeEntries

Data fetching and mutations for time entries.

```typescript
function useTimeEntries(
  selectedDate: string,
  onEntriesChange?: () => void
): {
  entries: TimeEntryWithTask[]
  tasks: Task[]
  isLoading: boolean
  createEntry: (taskName: string, duration: number) => Promise<number>
  updateTaskName: (entryId: number, newTaskName: string) => Promise<void>
  updateDuration: (entryId: number, newDuration: number) => Promise<void>
  deleteEntry: (entryId: number) => Promise<void>
  reload: () => Promise<void>
}
```

**Key behavior**:
- Auto-loads entries when `selectedDate` changes
- `createEntry` finds or creates task by name (case-insensitive match)
- `updateDuration(id, 0)` deletes the entry
- Calls `onEntriesChange` after any mutation

### useInlineEdit

Manages which field is being edited and the edit values.

```typescript
function useInlineEdit(): {
  editingEntry: { id: number; field: 'taskName' | 'duration' } | null
  editTaskName: string
  editDuration: string
  setEditTaskName: (value: string) => void
  setEditDuration: (value: string) => void
  startEditingTaskName: (id: number, currentValue: string) => void
  startEditingDuration: (id: number, currentValue: string) => void
  cancelEditing: () => void
  isEditing: (id: number, field: 'taskName' | 'duration') => boolean
}
```

Only one field can be edited at a time across all entries.

## Utils

### duration.ts

**formatDuration(seconds: number): string**
- Converts seconds to "Xh Ym" display format
- Always shows both units: "2h 15m", "0h 45m"

**formatDurationForEdit(seconds: number): string**
- Compact format for editing: "45m", "2h", "2h 15m"
- Omits zero units

**parseDuration(input: string): number | null**
- Parses flexible input formats
- Returns seconds or null if invalid
- See [activity-log.md](./activity-log.md) for format table

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
  date: number
  duration: number
}

interface TimeEntryWithTask extends TimeEntry {
  task: Task | undefined
}
```

## Styling

### Tailwind v4

Using `@theme inline` configuration — no tailwind.config.js. Theme values defined in CSS:

```css
@import 'tailwindcss';

@theme inline {
  /* Custom theme values */
}
```

### cn() Helper

Combines clsx and tailwind-merge for conditional classes:

```typescript
import { cn } from '@renderer/lib/utils'

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

### Path Alias

`@renderer/*` maps to `src/renderer/src/*`. Configured in tsconfig.web.json and electron.vite.config.ts.

## IPC Access

All main process communication via `window.api`:

```typescript
// Tasks
await window.api.tasks.getAll()
await window.api.tasks.create(name)

// Time entries
await window.api.timeEntries.getByDay(date)
await window.api.timeEntries.create(taskId, date, duration)

// Settings
await window.api.settings.get('current_task_id')

// Prompt (new)
await window.api.prompt.getState()
await window.api.prompt.resolve('confirm', taskId)
```

See [ipc.md](./ipc.md) for full API.

## Keyboard Handling

Components handle their own keyboard events:

```typescript
function handleKeyDown(e: React.KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    save()
  } else if (e.key === 'Escape') {
    cancel()
  }
}

<input onKeyDown={handleKeyDown} />
```

Global shortcuts (Cmd+Enter in prompt) use `useEffect` with document listener:

```typescript
useEffect(() => {
  function handleGlobalKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.metaKey) {
      confirmCurrentTask()
    }
  }
  document.addEventListener('keydown', handleGlobalKeyDown)
  return () => document.removeEventListener('keydown', handleGlobalKeyDown)
}, [])
```

## Future Considerations

- **Week/month views**: New components with aggregated data display
- **Theming**: Dark mode support via CSS variables
- **Animations**: Framer Motion for smooth transitions
