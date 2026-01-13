import { ElectronAPI } from '@electron-toolkit/preload'

export interface Task {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: number
  task_id: number
  date: string
  duration: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      tasks: {
        getAll: () => Promise<Task[]>
        getById: (id: number) => Promise<Task | undefined>
        create: (name: string) => Promise<Task>
        update: (id: number, name: string) => Promise<void>
        delete: (id: number) => Promise<void>
      }
      timeEntries: {
        getAll: () => Promise<TimeEntry[]>
        getById: (id: number) => Promise<TimeEntry | undefined>
        create: (taskId: number, date: string, duration: number) => Promise<TimeEntry>
        update: (id: number, taskId: number, date: string, duration: number) => Promise<void>
        delete: (id: number) => Promise<void>
        getByDay: (date: string) => Promise<TimeEntry[]>
        getByWeek: (date: string) => Promise<TimeEntry[]>
        getByMonth: (date: string) => Promise<TimeEntry[]>
      }
    }
  }
}
