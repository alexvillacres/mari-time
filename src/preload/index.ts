import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
