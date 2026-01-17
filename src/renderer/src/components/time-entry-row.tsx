import type { TimeEntryWithTask } from '../types/time-entries'
import { formatDuration } from '../utils/duration'

interface TimeEntryRowProps {
  entry: TimeEntryWithTask
  isEditingTaskName: boolean
  isEditingDuration: boolean
  editTaskName: string
  editDuration: string
  onEditTaskNameChange: (value: string) => void
  onEditDurationChange: (value: string) => void
  onStartEditTaskName: () => void
  onStartEditDuration: () => void
  onSaveTaskName: () => void
  onSaveDuration: () => void
  onCancel: () => void
}

export default function TimeEntryRow({
  entry,
  isEditingTaskName,
  isEditingDuration,
  editTaskName,
  editDuration,
  onEditTaskNameChange,
  onEditDurationChange,
  onStartEditTaskName,
  onStartEditDuration,
  onSaveTaskName,
  onSaveDuration,
  onCancel
}: TimeEntryRowProps): React.JSX.Element {
  function handleKeyDown(
    e: React.KeyboardEvent,
    saveHandler: () => void
  ): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveHandler()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between gap-2">
        {/* Task Name - Editable */}
        {isEditingTaskName ? (
          <input
            type="text"
            value={editTaskName}
            onChange={(e) => onEditTaskNameChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, onSaveTaskName)}
            onBlur={onSaveTaskName}
            onFocus={(e) => e.target.select()}
            autoFocus
            className="text-sm flex-1 mr-4 bg-transparent border-none outline-none"
          />
        ) : (
          <span
            onClick={onStartEditTaskName}
            className="text-sm truncate flex-1 mr-4 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
          >
            {entry.task?.name || 'Unknown Task'}
          </span>
        )}

        {/* Duration - Editable */}
        {isEditingDuration ? (
          <input
            type="text"
            value={editDuration}
            onChange={(e) => onEditDurationChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, onSaveDuration)}
            onBlur={onSaveDuration}
            onFocus={(e) => e.target.select()}
            autoFocus
            placeholder="0m"
            className="text-sm text-right w-20 bg-transparent border-none outline-none text-muted-foreground"
          />
        ) : (
          <span
            onClick={onStartEditDuration}
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
