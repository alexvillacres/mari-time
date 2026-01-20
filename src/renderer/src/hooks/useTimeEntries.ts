import { useState, useEffect, useCallback } from 'react'
import type { Task, TimeEntryWithTask } from '../types/time-entries'

interface UseTimeEntriesReturn {
  entries: TimeEntryWithTask[]
  isLoading: boolean
  error: Error | null
  createEntry: (taskName: string, duration: number) => Promise<number>
  updateTaskName: (entryId: number, newTaskName: string) => Promise<void>
  updateDuration: (entryId: number, newDuration: number) => Promise<void>
  deleteEntry: (entryId: number) => Promise<void>
}

export function useTimeEntries(
  selectedDate: string,
  onEntriesChange?: () => void
): UseTimeEntriesReturn {
  const [entries, setEntries] = useState<TimeEntryWithTask[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
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
    } catch (error) {
      setError(error instanceof Error ? error : new Error('An unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const findOrCreateTask = useCallback(
    async (taskName: string): Promise<Task> => {
      const trimmed = taskName.trim()
      const existing = tasks.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())

      if (existing) return existing

      const newTask = await window.api.tasks.create(trimmed)
      setTasks((prev) => [...prev, newTask])
      return newTask
    },
    [tasks]
  )

  const createEntry = useCallback(
    async (taskName: string, duration: number): Promise<number> => {
      const task = await findOrCreateTask(taskName)
      const newEntry = await window.api.timeEntries.create(task.id, selectedDate, duration)

      setEntries((prev) => [...prev, { ...newEntry, task }])
      onEntriesChange?.()
      return newEntry.id
    },
    [findOrCreateTask, selectedDate, onEntriesChange]
  )

  const updateTaskName = useCallback(
    async (entryId: number, name: string) => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      const previousEntries = entries
      const task = await findOrCreateTask(name)

      // Optimistic update
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, task_id: task.id, task } : e))
      )

      try {
        await window.api.timeEntries.update(entryId, task.id, entry.date, entry.duration)
        onEntriesChange?.()
      } catch (err) {
        // Rollback on failure
        setEntries(previousEntries)
        throw err
      }
    },
    [entries, findOrCreateTask, onEntriesChange]
  )

  const updateDuration = useCallback(
    async (entryId: number, duration: number) => {
      const entry = entries.find((e) => e.id === entryId)
      if (!entry) return

      const previousEntries = entries

      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, duration } : e)))

      try {
        await window.api.timeEntries.update(entryId, entry.task_id, entry.date, duration)
        onEntriesChange?.()
      } catch (err) {
        setEntries(previousEntries)
        throw err
      }
    },
    [entries, onEntriesChange]
  )

  const deleteEntry = useCallback(
    async (entryId: number) => {
      const previousEntries = entries

      // Optimistic update
      setEntries((prev) => prev.filter((e) => e.id !== entryId))

      try {
        await window.api.timeEntries.delete(entryId)
        onEntriesChange?.()
      } catch (err) {
        setEntries(previousEntries)
        throw err
      }
    },
    [entries, onEntriesChange]
  )

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateTaskName,
    updateDuration,
    deleteEntry
  }
}
