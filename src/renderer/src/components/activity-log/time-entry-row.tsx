import type { TimeEntryWithTask } from '../../types/time-entries'
import { formatDuration, formatDurationForEdit, parseDuration } from '../../utils/duration'
import { useState, useRef, useEffect } from 'react'

interface TimeEntryRowProps {
  entry: TimeEntryWithTask
  onUpdateTaskName: (entryId: number, value: string) => void
  onUpdateDuration: (entryId: number, value: number) => void
  onDelete: () => void
}

type EditingField = 'taskName' | 'duration' | null

export default function TimeEntryRow({
  entry,
  onUpdateTaskName,
  onUpdateDuration,
  onDelete
}: TimeEntryRowProps): React.JSX.Element {
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingField])

  function startEditing(field: EditingField): void {
    if (field === 'taskName') {
      setEditValue(entry.task?.name || '')
    } else if (field === 'duration') {
      setEditValue(formatDurationForEdit(entry.duration))
    }
    setEditingField(field)
    inputRef.current?.focus()
  }

  function cancelEditing(): void {
    setEditingField(null)
    setEditValue('')
  }

  async function saveTaskName(): Promise<void> {
    const trimmed = editValue.trim()

    if (!trimmed || trimmed === entry.task?.name) {
      cancelEditing()
      return
    }
    try {
      await onUpdateTaskName(entry.id, trimmed)
    } catch (error) {
      console.error('Error saving task name:', error)
    }
    cancelEditing()
  }

  async function saveDuration(): Promise<void> {
    const parsed = parseDuration(editValue)

    // Invalid duration, cancel editing
    if (parsed === null) {
      cancelEditing()
      return
    }

    // 0 duration = delete entry
    if (parsed === 0) {
      try {
        await onDelete()
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
      cancelEditing()
      return
    }

    // No change, cancel editing
    if (parsed === entry.duration) {
      cancelEditing()
      return
    }

    // Save new duration
    try {
      await onUpdateDuration(entry.id, parsed)
    } catch (error) {
      console.error('Error saving duration:', error)
    }
    cancelEditing()
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      if (editingField === 'taskName') {
        saveTaskName()
      } else if (editingField === 'duration') {
        saveDuration()
      }
    }
    if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  function handleBlur(): void {
    if (editingField === 'taskName') {
      saveTaskName()
    } else if (editingField === 'duration') {
      saveDuration()
    }
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between gap-2">
        {/* Task Name - Editable */}
        {editingField === 'taskName' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            onBlur={handleBlur}
            className="text-sm flex-1 mr-4 bg-transparent border-none outline-none"
          />
        ) : (
          <span
            onClick={() => startEditing('taskName')}
            className="text-sm truncate flex-1 mr-4 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
          >
            {entry.task?.name || 'Unknown Task'}
          </span>
        )}

        {/* Duration - Editable */}
        {editingField === 'duration' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            onBlur={handleBlur}
            placeholder="0m"
            className="text-sm text-right w-20 bg-transparent border-none outline-none text-muted-foreground"
          />
        ) : (
          <span
            onClick={() => startEditing('duration')}
            className="text-sm text-muted-foreground shrink-0 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
          >
            {formatDuration(entry.duration)}
          </span>
        )}
      </div>
      <div className="h-0.5 bg-green-400/60 mt-1 rounded-full" />
    </div>
  )
}
