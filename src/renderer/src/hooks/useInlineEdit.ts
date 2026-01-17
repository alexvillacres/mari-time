import { useState, useCallback } from 'react'

type EditField = 'taskName' | 'duration'

interface EditingState {
  id: number
  field: EditField
}

interface UseInlineEditReturn {
  editingEntry: EditingState | null
  editTaskName: string
  editDuration: string
  setEditTaskName: (value: string) => void
  setEditDuration: (value: string) => void
  startEditingTaskName: (id: number, currentValue: string) => void
  startEditingDuration: (id: number, currentValue: string) => void
  cancelEditing: () => void
  isEditing: (id: number, field: EditField) => boolean
}

export function useInlineEdit(): UseInlineEditReturn {
  const [editingEntry, setEditingEntry] = useState<EditingState | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editDuration, setEditDuration] = useState('')

  const startEditingTaskName = useCallback((id: number, currentValue: string) => {
    setEditingEntry({ id, field: 'taskName' })
    setEditTaskName(currentValue)
  }, [])

  const startEditingDuration = useCallback((id: number, currentValue: string) => {
    setEditingEntry({ id, field: 'duration' })
    setEditDuration(currentValue)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingEntry(null)
    setEditTaskName('')
    setEditDuration('')
  }, [])

  const isEditing = useCallback(
    (id: number, field: EditField): boolean => {
      return editingEntry?.id === id && editingEntry.field === field
    },
    [editingEntry]
  )

  return {
    editingEntry,
    editTaskName,
    editDuration,
    setEditTaskName,
    setEditDuration,
    startEditingTaskName,
    startEditingDuration,
    cancelEditing,
    isEditing
  }
}
