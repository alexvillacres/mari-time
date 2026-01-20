import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../utils/duration'
import { useTimeEntries } from '../hooks/useTimeEntries'
import { ActivityLog } from './activity-log/activity-log'

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateHeader(dateString: string): string {
  const today = getDateString(new Date())
  if (dateString === today) {
    return 'Today'
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateString === getDateString(yesterday)) {
    return 'Yesterday'
  }

  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Popover(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(() => getDateString(new Date()))

  const { entries, isLoading, error, createEntry, updateTaskName, updateDuration, deleteEntry } =
    useTimeEntries(selectedDate)

  const isToday = selectedDate === getDateString(new Date())
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration, 0)

  const goToNextDay = (): void => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    setSelectedDate(getDateString(current))
  }

  const goToPreviousDay = (): void => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    setSelectedDate(getDateString(current))
  }

  return (
    <div className="p-4 h-screen flex flex-col">
      <div className="space-y-6 flex flex-col flex-1 min-h-0">
        {/* Header with date navigation and total time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousDay}
              className="p-0.5 rounded hover:bg-muted transition-colors"
              aria-label="Previous day"
              autoFocus={false}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next day"
              autoFocus={false}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-medium text-center ml-2">
              {formatDateHeader(selectedDate)}
            </h1>
          </div>
          <span className="text-xs text-muted-foreground mr-2">{formatDuration(totalSeconds)}</span>
        </div>

        {/* Activity Log */}
        <div className="flex-1 min-h-0">
          <ActivityLog
            entries={entries}
            isLoading={isLoading}
            error={error}
            onCreateEntry={createEntry}
            onUpdateTaskName={updateTaskName}
            onUpdateDuration={updateDuration}
            onDeleteEntry={deleteEntry}
          />
        </div>
      </div>
    </div>
  )
}
