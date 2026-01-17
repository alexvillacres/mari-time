import { Plus } from 'lucide-react'
import { useState, useEffect, useLayoutEffect } from 'react'
import { useTimeEntries } from '../hooks/useTimeEntries'
import { useInlineEdit } from '../hooks/useInlineEdit'
import { formatDurationForEdit, parseDuration } from '../utils/duration'
import TimeEntryRow from './time-entry-row'
import AddEntryForm from './add-entry-form'

interface ActivityLogProps {
  selectedDate: string
  onEntriesChange?: () => void
}

export default function ActivityLog({
  selectedDate,
  onEntriesChange
}: ActivityLogProps): React.JSX.Element {
  const { entries, createEntry, updateTaskName, updateDuration } = useTimeEntries(
    selectedDate,
    onEntriesChange
  )

  const {
    editTaskName,
    editDuration,
    setEditTaskName,
    setEditDuration,
    startEditingTaskName,
    startEditingDuration,
    cancelEditing,
    isEditing
  } = useInlineEdit()

  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [pendingFocusEntryId, setPendingFocusEntryId] = useState<number | null>(null)

  // Reset state when date changes
  useLayoutEffect(() => {
    setIsAddingEntry(false)
    setPendingFocusEntryId(null)
    // Defer to next tick to avoid cascading render from updating hook state
    setTimeout(cancelEditing, 0)
  }, [selectedDate, cancelEditing])

  // Auto-focus duration field after creating new entry
  useEffect(() => {
    if (pendingFocusEntryId === null) return

    const entry = entries.find((e) => e.id === pendingFocusEntryId)
    if (entry) {
      const entryId = entry.id
      const durationValue = formatDurationForEdit(entry.duration)
      setPendingFocusEntryId(null)
      // Defer to next tick to avoid cascading render from updating hook state
      setTimeout(() => startEditingDuration(entryId, durationValue), 0)
    }
  }, [entries, pendingFocusEntryId, startEditingDuration])

  async function handleAddEntry(taskName: string, duration: string): Promise<void> {
    if (!taskName.trim()) {
      setIsAddingEntry(false)
      return
    }

    const parsedDuration = parseDuration(duration) ?? 0
    const newEntryId = await createEntry(taskName.trim(), parsedDuration)

    setIsAddingEntry(false)
    if (!duration.trim()) {
      setPendingFocusEntryId(newEntryId)
    }
  }

  async function handleSaveTaskName(entryId: number): Promise<void> {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) {
      cancelEditing()
      return
    }

    const trimmedName = editTaskName.trim()
    if (!trimmedName || trimmedName === entry.task?.name) {
      cancelEditing()
      return
    }

    await updateTaskName(entryId, trimmedName)
    cancelEditing()
  }

  async function handleSaveDuration(entryId: number): Promise<void> {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) {
      cancelEditing()
      return
    }

    const parsed = parseDuration(editDuration)
    if (parsed === null || parsed === entry.duration) {
      cancelEditing()
      return
    }

    await updateDuration(entryId, parsed)
    cancelEditing()
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
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                isEditingTaskName={isEditing(entry.id, 'taskName')}
                isEditingDuration={isEditing(entry.id, 'duration')}
                editTaskName={editTaskName}
                editDuration={editDuration}
                onEditTaskNameChange={setEditTaskName}
                onEditDurationChange={setEditDuration}
                onStartEditTaskName={() => startEditingTaskName(entry.id, entry.task?.name || '')}
                onStartEditDuration={() =>
                  startEditingDuration(entry.id, formatDurationForEdit(entry.duration))
                }
                onSaveTaskName={() => handleSaveTaskName(entry.id)}
                onSaveDuration={() => handleSaveDuration(entry.id)}
                onCancel={cancelEditing}
              />
            ))}
          </div>
        )}

        {/* Add entry form */}
        {isAddingEntry && (
          <AddEntryForm
            onSubmit={handleAddEntry}
            onCancel={() => setIsAddingEntry(false)}
            isEmpty={isEmpty}
          />
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
