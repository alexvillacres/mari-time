import { useState, useRef, useEffect } from 'react'
import { parseDuration } from '../../utils/duration'

interface AddEntryFormProps {
  onSubmit: (taskName: string, duration: number) => void
  onCancel: () => void
  isEmpty: boolean
}

export default function AddEntryForm({
  onSubmit,
  onCancel,
  isEmpty
}: AddEntryFormProps): React.JSX.Element {
  const [taskName, setTaskName] = useState('')
  const [duration, setDuration] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const taskInputRef = useRef<HTMLInputElement>(null)
  const durationInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    taskInputRef.current?.focus()
  }, [])

  async function handleSubmit(): Promise<void> {
    const trimmed = taskName.trim()

    if (!trimmed) {
      onCancel()
      return
    }

    const parsedDuration = parseDuration(duration) ?? 0

    setIsSubmitting(true)

    try {
      await onSubmit(trimmed, parsedDuration)
    } catch (error) {
      console.error('Error submitting entry:', error)
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  function handleBlur(e: React.FocusEvent): void {
    const movingToTask = e.relatedTarget === taskInputRef.current
    const movingToDuration = e.relatedTarget === durationInputRef.current

    if (movingToTask || movingToDuration || isSubmitting) return

    handleSubmit()
  }

  return (
    <div className={isEmpty ? '' : 'mt-2'}>
      <div className="flex items-center justify-between">
        <input
          ref={taskInputRef}
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Task name..."
          className="text-sm flex-1 mr-4 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        />
        <input
          ref={durationInputRef}
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="0m"
          className="text-sm text-right w-16 bg-transparent border-none outline-none text-muted-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="h-0.5 bg-green-400/60 mt-1 rounded-full" />
    </div>
  )
}
