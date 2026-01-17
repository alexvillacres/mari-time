import { useState, useRef, useEffect } from 'react'

interface AddEntryFormProps {
  onSubmit: (taskName: string, duration: string) => void
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
  const taskInputRef = useRef<HTMLInputElement>(null)
  const durationInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    taskInputRef.current?.focus()
  }, [])

  function handleSubmit(): void {
    onSubmit(taskName, duration)
    setTaskName('')
    setDuration('')
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  function handleTaskBlur(e: React.FocusEvent): void {
    if (e.relatedTarget === durationInputRef.current) return
    handleSubmit()
  }

  function handleDurationBlur(e: React.FocusEvent): void {
    if (e.relatedTarget === taskInputRef.current) return
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
          onBlur={handleTaskBlur}
          placeholder="Task name..."
          className="text-sm flex-1 mr-4 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        />
        <input
          ref={durationInputRef}
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleDurationBlur}
          placeholder="0m"
          className="text-sm text-right w-16 bg-transparent border-none outline-none text-muted-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="h-0.5 bg-green-400/60 mt-1 rounded-full" />
    </div>
  )
}
