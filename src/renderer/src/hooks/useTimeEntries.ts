import { useState, useEffect, useCallback } from 'react'
import type { Task, TimeEntryWithTask } from '../types/time-entries'

interface UseTimeEntriesReturn {
  entries: TimeEntryWithTask[]
  tasks: Task[]
  isLoading: boolean
  createEntry: (taskName: string, duration: number) => Promise<number>
  updateTaskName: (entryId: number, newTaskName: string) => Promise<void>
  updateDuration: (entryId: number, newDuration: number) => Promise<void>
  deleteEntry: (entryId: number) => Promise<void>
  reload: () => Promise<void>
}

export function useTimeEntries(
  selectedDate: string,
  onEntriesChange?: () => void
): UseTimeEntriesReturn {
  const [entries, setEntries] = useState<TimeEntryWithTask[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    const [entriesData, tasksData] = await Promise.all([
      window.api.timeEntries.getByDay(selectedDate),
      window.api.tasks.getAll()
    ])

    setTasks(tasksData)

    const entriesWithTasks = entriesData.map((entry) => ({
      ...entry,
      task: tasksData.find((t) => t.id === entry.task_id)
    }))

    setEntries(entriesWithTasks)
    setIsLoading(false)
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const findOrCreateTask = useCallback(
    async (taskName: string): Promise<Task> => {
      const trimmedName = taskName.trim()
      let task = tasks.find((t) => t.name.toLowerCase() === trimmedName.toLowerCase())
      if (!task) {
        task = await window.api.tasks.create(trimmedName)
      }
      return task
    },
    [tasks]
  )

  const createEntry = useCallback(
    async (taskName: string, duration: number): Promise<number> => {
      const task = await findOrCreateTask(taskName)
      const newEntry = await window.api.timeEntries.create(task.id, selectedDate, duration)
      await loadData()
      onEntriesChange?.()
      return newEntry.id
    },
    [findOrCreateTask, selectedDate, loadData, onEntriesChange]
  )

  const updateTaskName = useCallback(
    async (entryId: number, newTaskName: string): Promise<void> => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      const task = await findOrCreateTask(newTaskName)
      await window.api.timeEntries.update(entryId, task.id, entry.date, entry.duration)
      await loadData()
      onEntriesChange?.()
    },
    [entries, findOrCreateTask, loadData, onEntriesChange]
  )

  const updateDuration = useCallback(
    async (entryId: number, newDuration: number): Promise<void> => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      if (newDuration === 0) {
        await window.api.timeEntries.delete(entryId)
      } else {
        await window.api.timeEntries.update(entryId, entry.task_id, entry.date, newDuration)
      }
      await loadData()
      onEntriesChange?.()
    },
    [entries, loadData, onEntriesChange]
  )

  const deleteEntry = useCallback(
    async (entryId: number): Promise<void> => {
      await window.api.timeEntries.delete(entryId)
      await loadData()
      onEntriesChange?.()
    },
    [loadData, onEntriesChange]
  )

  return {
    entries,
    tasks,
    isLoading,
    createEntry,
    updateTaskName,
    updateDuration,
    deleteEntry,
    reload: loadData
  }
}
