// activity-log.tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { TimeEntryWithTask } from '../../types/time-entries'
import TimeEntryRow from './time-entry-row'
import AddEntryForm from './add-entry-form'

interface ActivityLogProps {
  entries: TimeEntryWithTask[]
  isLoading: boolean
  error: Error | null
  onCreateEntry: (taskName: string, duration: number) => Promise<number>
  onUpdateTaskName: (entryId: number, name: string) => Promise<void>
  onUpdateDuration: (entryId: number, duration: number) => Promise<void>
  onDeleteEntry: (entryId: number) => Promise<void>
}

export function ActivityLog({
  entries,
  isLoading,
  error,
  onCreateEntry,
  onUpdateTaskName,
  onUpdateDuration,
  onDeleteEntry
}: ActivityLogProps): React.JSX.Element {
  const [isAddingEntry, setIsAddingEntry] = useState(false)

  async function handleCreateEntry(taskName: string, duration: number): Promise<void> {
    await onCreateEntry(taskName, duration)
    setIsAddingEntry(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">Failed to load entries</p>
      </div>
    )
  }

  const isEmpty = entries.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty && !isAddingEntry && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No entries for this day</p>
          </div>
        )}

        {!isEmpty && (
          <div className="space-y-2">
            {entries.map((entry) => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                onUpdateTaskName={onUpdateTaskName}
                onUpdateDuration={onUpdateDuration}
                onDelete={() => onDeleteEntry(entry.id)}
              />
            ))}
          </div>
        )}

        {isAddingEntry && (
          <div className={isEmpty ? '' : 'mt-2'}>
            <AddEntryForm
              isEmpty={isEmpty}
              onSubmit={handleCreateEntry}
              onCancel={() => setIsAddingEntry(false)}
            />
          </div>
        )}
      </div>

      {!isAddingEntry && (
        <div className="flex shrink-0 justify-end pt-2">
          <button
            onClick={() => setIsAddingEntry(true)}
            className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs transition-colors hover:bg-muted/80"
          >
            Add entry
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
