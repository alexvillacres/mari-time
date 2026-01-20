import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:get-all'),
    getById: (id: number) => ipcRenderer.invoke('tasks:get-by-id', id),
    create: (name: string) => ipcRenderer.invoke('tasks:create', name),
    update: (id: number, name: string) => ipcRenderer.invoke('tasks:update', id, name),
    delete: (id: number) => ipcRenderer.invoke('tasks:delete', id)
  },
  timeEntries: {
    getAll: () => ipcRenderer.invoke('time-entries:get-all'),
    getById: (id: number) => ipcRenderer.invoke('time-entries:get-by-id', id),
    create: (taskId: number, date: string, duration: number) =>
      ipcRenderer.invoke('time-entries:create', taskId, date, duration),
    update: (id: number, taskId: number, date: string, duration: number) =>
      ipcRenderer.invoke('time-entries:update', id, taskId, date, duration),
    delete: (id: number) => ipcRenderer.invoke('time-entries:delete', id),
    getByDay: (date: string) => ipcRenderer.invoke('time-entries:get-by-day', date),
    getByWeek: (date: string) => ipcRenderer.invoke('time-entries:get-by-week', date),
    getByMonth: (date: string) => ipcRenderer.invoke('time-entries:get-by-month', date)
  },
  window: {
    resize: (height: number) => ipcRenderer.invoke('window:resize', height)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value)
  },
  prompt: {
    getState: () => ipcRenderer.invoke('prompt:get-state'),
    resolve: (action: 'confirm' | 'deny' | 'switch', taskId?: number) =>
      ipcRenderer.invoke('prompt:resolve', action, taskId)
  }
}

// Expose APIs to renderer via contextBridge
contextBridge.exposeInMainWorld('api', api)
