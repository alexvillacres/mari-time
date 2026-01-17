export interface Task {
  id: number
  name: string
}

export interface TimeEntry {
  id: number
  task_id: number
  date: string
  duration: number
}

export interface TimeEntryWithTask extends TimeEntry {
  task: Task | undefined
}
