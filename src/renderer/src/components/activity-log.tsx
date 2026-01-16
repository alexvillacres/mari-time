import { Plus } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface Task {
  id: number
  name: string
}

interface TimeEntry {
  id: number
  task_id: number
  date: string
  duration: number
}

interface TimeEntryWithTask extends TimeEntry {
  task: Task | undefined
}

interface ActivityLogProps {
  selectedDate: string
  onEntriesChange?: () => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatDurationForEdit(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  // Try "HH:MM" or "H:MM" format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (minutes < 60) {
      return hours * 3600 + minutes * 60
    }
  }

  // Try "1h 30m", "2h", "45m", "1h30m" formats
  let totalSeconds = 0
  let hasMatch = false

  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hourMatch) {
    totalSeconds += parseFloat(hourMatch[1]) * 3600
    hasMatch = true
  }

  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m/)
  if (minMatch) {
    totalSeconds += parseFloat(minMatch[1]) * 60
    hasMatch = true
  }

  // Plain number = minutes
  if (!hasMatch) {
    const plainNumber = parseFloat(trimmed)
    if (!isNaN(plainNumber)) {
      return plainNumber * 60
    }
  }

  return hasMatch ? Math.round(totalSeconds) : null
}

export default function ActivityLog({
  selectedDate,
  onEntriesChange
}: ActivityLogProps): React.JSX.Element {
  const [entries, setEntries] = useState<TimeEntryWithTask[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const newDurationInputRef = useRef<HTMLInputElement>(null)

  // Editing state
  const [editingEntry, setEditingEntry] = useState<{
    id: number
    field: 'taskName' | 'duration'
  } | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [newlyCreatedEntryId, setNewlyCreatedEntryId] = useState<number | null>(null)
  const durationInputRef = useRef<HTMLInputElement>(null)
  const taskNameInputRef = useRef<HTMLInputElement>(null)

  // Load data for a specific date
  async function loadData(date: string): Promise<void> {
    const [entriesData, tasksData] = await Promise.all([
      window.api.timeEntries.getByDay(date),
      window.api.tasks.getAll()
    ])

    setTasks(tasksData)

    const entriesWithTasks = entriesData.map((entry) => ({
      ...entry,
      task: tasksData.find((t) => t.id === entry.task_id)
    }))

    setEntries(entriesWithTasks)
  }

  useEffect(() => {
    // Reset state when date changes
    setEditingEntry(null)
    setEditTaskName('')
    setEditDuration('')
    setIsAddingEntry(false)
    setNewTaskName('')
    setNewDuration('')
    setNewlyCreatedEntryId(null)
    // Pass date explicitly to avoid stale closure
    loadData(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    if (isAddingEntry && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingEntry])

  // Auto-focus duration field after creating new entry
  useEffect(() => {
    if (newlyCreatedEntryId !== null) {
      const entry = entries.find((e) => e.id === newlyCreatedEntryId)
      if (entry) {
        startEditingDuration(entry)
        setNewlyCreatedEntryId(null)
      }
    }
  }, [entries, newlyCreatedEntryId])

  async function handleAddEntry(): Promise<void> {
    console.log('[UI] handleAddEntry called, newTaskName:', newTaskName)
    if (!newTaskName.trim()) {
      console.log('[UI] Empty task name, returning early')
      setNewDuration('')
      setIsAddingEntry(false)
      return
    }

    // Check if task exists or create new one
    let task = tasks.find((t) => t.name.toLowerCase() === newTaskName.toLowerCase())
    console.log('[UI] Existing task found:', task)

    if (!task) {
      console.log('[UI] Creating new task...')
      task = await window.api.tasks.create(newTaskName.trim())
      console.log('[UI] Task created:', task)
    }

    // Create time entry with parsed duration (or 0 if not set)
    const duration = parseDuration(newDuration) ?? 0
    console.log('[UI] Creating time entry with:', { taskId: task.id, selectedDate, duration })
    const newEntry = await window.api.timeEntries.create(task.id, selectedDate, duration)
    console.log('[UI] Time entry created:', newEntry)

    setNewTaskName('')
    setNewDuration('')
    setIsAddingEntry(false)
    // Only auto-focus duration if it wasn't already set
    if (!newDuration.trim()) {
      setNewlyCreatedEntryId(newEntry.id)
    }
    await loadData(selectedDate)
    onEntriesChange?.()
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      handleAddEntry()
    } else if (e.key === 'Escape') {
      setNewTaskName('')
      setNewDuration('')
      setIsAddingEntry(false)
    }
  }

  // Editing functions
  function startEditingTaskName(entry: TimeEntryWithTask): void {
    setEditingEntry({ id: entry.id, field: 'taskName' })
    setEditTaskName(entry.task?.name || '')
  }

  function startEditingDuration(entry: TimeEntryWithTask): void {
    console.log('startEditingDuration called', entry.id)
    setEditingEntry({ id: entry.id, field: 'duration' })
    setEditDuration(formatDurationForEdit(entry.duration))
  }

  function cancelEditing(): void {
    setEditingEntry(null)
    setEditTaskName('')
    setEditDuration('')
  }

  async function saveTaskName(entry: TimeEntryWithTask): Promise<void> {
    const trimmedName = editTaskName.trim()

    if (!trimmedName || trimmedName === entry.task?.name) {
      cancelEditing()
      return
    }

    let task = tasks.find((t) => t.name.toLowerCase() === trimmedName.toLowerCase())
    if (!task) {
      task = await window.api.tasks.create(trimmedName)
    }

    await window.api.timeEntries.update(entry.id, task.id, entry.date, entry.duration)

    cancelEditing()
    await loadData(selectedDate)
    onEntriesChange?.()
  }

  async function saveDuration(entry: TimeEntryWithTask): Promise<void> {
    const parsed = parseDuration(editDuration)

    if (parsed === null || parsed === entry.duration) {
      cancelEditing()
      return
    }

    // Delete entry if duration is 0
    if (parsed === 0) {
      await window.api.timeEntries.delete(entry.id)
    } else {
      await window.api.timeEntries.update(entry.id, entry.task_id, entry.date, parsed)
    }

    cancelEditing()
    await loadData(selectedDate)
    onEntriesChange?.()
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent,
    entry: TimeEntryWithTask,
    field: 'taskName' | 'duration'
  ): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'taskName') {
        saveTaskName(entry)
      } else {
        saveDuration(entry)
      }
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const isEmpty = entries.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Empty state */}
        {isEmpty && !isAddingEntry && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No entries for this day</p>
          </div>
        )}

        {/* Time entries list */}
        {!isEmpty && (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="group">
                <div className="flex items-center justify-between gap-2">
                  {/* Task Name - Editable */}
                  {editingEntry?.id === entry.id && editingEntry.field === 'taskName' ? (
                    <input
                      ref={taskNameInputRef}
                      type="text"
                      value={editTaskName}
                      onChange={(e) => setEditTaskName(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, entry, 'taskName')}
                      onBlur={() => saveTaskName(entry)}
                      onFocus={(e) => e.target.select()}
                      autoFocus
                      className="text-sm flex-1 mr-4 bg-transparent border-none outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => startEditingTaskName(entry)}
                      className="text-sm truncate flex-1 mr-4 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
                    >
                      {entry.task?.name || 'Unknown Task'}
                    </span>
                  )}

                  {/* Duration - Editable */}
                  {editingEntry?.id === entry.id && editingEntry.field === 'duration' ? (
                    <input
                      ref={durationInputRef}
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, entry, 'duration')}
                      onBlur={() => saveDuration(entry)}
                      onFocus={(e) => e.target.select()}
                      autoFocus
                      placeholder="0m"
                      className="text-sm text-right w-20 bg-transparent border-none outline-none text-muted-foreground"
                    />
                  ) : (
                    <span
                      onClick={() => startEditingDuration(entry)}
                      className="text-sm text-muted-foreground shrink-0 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    >
                      {formatDuration(entry.duration)}
                    </span>
                  )}

                </div>
                <div className="h-0.5 bg-green-400/60 mt-1 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Inline add entry input */}
        {isAddingEntry && (
          <div className={isEmpty ? '' : 'mt-2'}>
            <div className="flex items-center justify-between">
              <input
                ref={inputRef}
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Don't submit if clicking on the duration input
                  if (e.relatedTarget === newDurationInputRef.current) return
                  handleAddEntry()
                }}
                placeholder="Task name..."
                className="text-sm flex-1 mr-4 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              />
              <input
                ref={newDurationInputRef}
                type="text"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Don't submit if clicking on the task name input
                  if (e.relatedTarget === inputRef.current) return
                  handleAddEntry()
                }}
                placeholder="0m"
                className="text-sm text-right w-16 bg-transparent border-none outline-none text-muted-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="h-0.5 bg-green-400/60 mt-1 rounded-full" />
          </div>
        )}
      </div>

      {/* Add entry button - always at bottom */}
      {!isAddingEntry && (
        <div className="flex justify-end pt-2 shrink-0">
          <button
            onClick={() => setIsAddingEntry(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          >
            Add entry
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export { formatDuration }
