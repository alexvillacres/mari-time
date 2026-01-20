import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Task } from '../types/time-entries'
import { cn } from '@renderer/lib/utils'

export default function Prompt(): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [newTaskName, setNewTaskName] = useState('')

  // Load initial state
  useEffect(() => {
    async function load(): Promise<void> {
      const [tasksData, state] = await Promise.all([
        window.api.tasks.getAll(),
        window.api.prompt.getState()
      ])
      setTasks(tasksData)
      setCurrentTaskId(state.currentTaskId)

      // Pre-select current task if exists
      if (state.currentTaskId) {
        const idx = tasksData.findIndex((t) => t.id === state.currentTaskId)
        if (idx >= 0) setSelectedIndex(idx)
      }
    }
    load()
  }, [])

  // Filter and order tasks - memoized to prevent unnecessary recalculations
  const orderedTasks = useMemo(() => {
    const filtered = newTaskName
      ? tasks.filter((t) => t.name.toLowerCase().includes(newTaskName.toLowerCase()))
      : tasks

    // Reorder to put current task at top
    if (currentTaskId) {
      return [
        ...filtered.filter((t) => t.id === currentTaskId),
        ...filtered.filter((t) => t.id !== currentTaskId)
      ]
    }
    return filtered
  }, [tasks, newTaskName, currentTaskId])

  const handleConfirm = useCallback(async () => {
    await window.api.prompt.resolve('confirm')
  }, [])

  const handleDeny = useCallback(async () => {
    await window.api.prompt.resolve('deny')
  }, [])

  const handleSwitch = useCallback(async (taskId: number) => {
    await window.api.prompt.resolve('switch', taskId)
  }, [])

  const handleCreateAndSwitch = useCallback(async () => {
    if (!newTaskName.trim()) return
    const task = await window.api.tasks.create(newTaskName.trim())
    await window.api.prompt.resolve('switch', task.id)
  }, [newTaskName])

  // Keyboard handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, orderedTasks.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Enter' && !e.metaKey) {
        e.preventDefault()
        if (orderedTasks.length === 0 && newTaskName.trim()) {
          handleCreateAndSwitch()
        } else if (orderedTasks.length > 0) {
          const clampedIdx = Math.min(selectedIndex, orderedTasks.length - 1)
          const selectedTask = orderedTasks[clampedIdx]
          if (selectedTask) {
            handleSwitch(selectedTask.id)
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleDeny()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    orderedTasks,
    selectedIndex,
    newTaskName,
    handleConfirm,
    handleDeny,
    handleSwitch,
    handleCreateAndSwitch
  ])

  // Clamp selected index - computed safely without effect
  const clampedSelectedIndex = Math.min(
    selectedIndex,
    orderedTasks.length > 0 ? orderedTasks.length - 1 : 0
  )

  return (
    <div className="p-4 h-screen flex flex-col bg-background rounded-lg">
      <h1 className="text-sm font-medium mb-3 text-foreground">What are you working on?</h1>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {orderedTasks.length === 0 && !newTaskName && (
          <p className="text-sm text-muted-foreground">No tasks yet. Create one below.</p>
        )}
        {orderedTasks.length === 0 && newTaskName && (
          <p className="text-sm text-muted-foreground">
            Press Enter to create &quot;{newTaskName}&quot;
          </p>
        )}
        {orderedTasks.map((task, index) => (
          <div
            key={task.id}
            onClick={() => handleSwitch(task.id)}
            className={cn(
              'px-2 py-1.5 rounded text-sm cursor-pointer transition-colors',
              index === clampedSelectedIndex && 'bg-muted',
              task.id === currentTaskId && 'font-medium'
            )}
          >
            {task.id === currentTaskId && (
              <span className="mr-2 text-green-500" aria-label="Current task">
                ●
              </span>
            )}
            {task.name}
          </div>
        ))}
      </div>

      {/* New task input */}
      <div className="mt-3 pt-3 border-t border-border">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => {
            setNewTaskName(e.target.value)
            setSelectedIndex(0)
          }}
          placeholder="+ New task..."
          className="w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50 text-foreground"
          autoFocus
        />
      </div>

      {/* Keyboard hints */}
      <div className="mt-2 text-xs text-muted-foreground/70 flex gap-3">
        <span>↑↓ navigate</span>
        <span>⏎ select</span>
        <span>⌘⏎ confirm</span>
        <span>esc deny</span>
      </div>
    </div>
  )
}
