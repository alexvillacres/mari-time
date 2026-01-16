import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, screen } from 'electron'
import { join } from 'path'
import * as db from './database'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/menu-bar-icon.png?asset'

let tray: Tray | null = null
let popover: BrowserWindow | null = null

// Convert "YYYY-MM-DD" string to midnight unix timestamp (seconds)
function dateStringToTimestamp(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  return Math.floor(date.getTime() / 1000)
}

function createTray(): void {
  const iconPath = is.dev
    ? join(process.cwd(), 'resources/menu-bar-icon.png')
    : join(process.resourcesPath, 'menu-bar-icon.png')

  let trayIcon: Electron.NativeImage

  try {
    // Load the PNG icon
    trayIcon = nativeImage.createFromPath(iconPath)

    // If empty, fallback to default icon
    if (trayIcon.isEmpty()) {
      throw new Error('PNG icon is empty')
    }
  } catch (error) {
    // Fallback to the app icon if PNG fails
    console.warn('Failed to load tray icon', error)
    trayIcon = nativeImage.createFromPath(icon)
  }

  const iconSize = process.platform === 'darwin' ? 22 : 16
  const resizedIcon = trayIcon.resize({ width: iconSize, height: iconSize })

  tray = new Tray(resizedIcon)
  tray.setToolTip('Mari')

  tray.on('click', () => {
    if (!popover) return
    if (popover.isVisible()) {
      hidePopover()
    } else {
      showPopover()
    }
  })
}

function createPopover(): BrowserWindow {
  popover = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  positionPopover()

  popover.on('ready-to-show', () => {
    popover?.show()
  })

  popover.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popover.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    popover.loadFile(join(__dirname, '../renderer/index.html'))
  }

  popover.on('blur', () => {
    // Small delay to allow internal focus changes (like clicking inputs)
    setTimeout(() => {
      if (!popover?.isFocused()) {
        popover?.hide()
      }
    }, 100)
  })

  return popover
}

function positionPopover(): void {
  if (!popover) return
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const workArea = display.workArea
  const { width: popoverWidth } = popover.getBounds()
  const x = workArea.x + screenWidth - popoverWidth - 8
  const y = workArea.y + 8
  popover.setPosition(x, y)
}

function showPopover(): void {
  if (!popover) return
  positionPopover()
  popover.show()
  popover.focus()
}

function hidePopover(): void {
  if (!popover) return
  popover.hide()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  db.initializeDatabase()

  ipcMain.handle('tasks:get-all', () => {
    return db.getAllTasks()
  })

  ipcMain.handle('tasks:get-by-id', (_, id: number) => {
    return db.getTaskById(id)
  })

  ipcMain.handle('tasks:create', (_, name: string) => {
    console.log('[IPC] tasks:create called with:', name)
    try {
      const task = db.createTask(name)
      console.log('[IPC] tasks:create result:', task)
      return task
    } catch (error) {
      console.error('[IPC] tasks:create error:', error)
      throw error
    }
  })

  ipcMain.handle('tasks:update', (_, id: number, name: string) => {
    return db.updateTask(id, name)
  })

  ipcMain.handle('tasks:delete', (_, id: number) => {
    return db.deleteTask(id)
  })

  ipcMain.handle('time-entries:get-all', () => {
    return db.getAllTimeEntries()
  })

  ipcMain.handle('time-entries:get-by-id', (_, id: number) => {
    return db.getTimeEntryById(id)
  })

  ipcMain.handle('time-entries:delete', (_, id: number) => {
    return db.deleteTimeEntry(id)
  })

  // Convert string date (YYYY-MM-DD) to midnight unix timestamp
  ipcMain.handle('time-entries:create', (_, taskId: number, date: string, duration: number) => {
    console.log('[IPC] time-entries:create called with:', { taskId, date, duration })
    try {
      const timestamp = dateStringToTimestamp(date)
      console.log('[IPC] time-entries:create timestamp:', timestamp)
      const entry = db.createTimeEntry(taskId, timestamp, duration)
      console.log('[IPC] time-entries:create result:', entry)
      return entry
    } catch (error) {
      console.error('[IPC] time-entries:create error:', error)
      throw error
    }
  })

  ipcMain.handle('time-entries:get-by-day', (_, date: string) => {
    const timestamp = dateStringToTimestamp(date)
    return db.getTimeEntriesByDate(timestamp)
  })

  ipcMain.handle('time-entries:get-by-week', (_, date: number) => {
    return db.getTimeEntriesByWeek(date)
  })

  ipcMain.handle('time-entries:get-by-month', (_, date: number) => {
    return db.getTimeEntriesByMonth(date)
  })

  ipcMain.handle('time-entries:get-by-range', (_, startDate: number, endDate: number) => {
    return db.getTimeEntriesByRange(startDate, endDate)
  })

  ipcMain.handle(
    'time-entries:update',
    (_, id: number, taskId: number, date: string, duration: number) => {
      return db.updateTimeEntry(id, taskId, date, duration)
    }
  )

  // manual functions (task and time)
  ipcMain.handle('time-entries:confirm-task', (_, taskId: number) => {
    return db.confirmTask(taskId)
  })

  ipcMain.handle('time-entries:update-time-entry-duration', (_, id: number, duration: number) => {
    return db.updateTimeEntryDuration(id, duration)
  })

  ipcMain.handle('time-entries:delete-time-entry', (_, id: number) => {
    return db.deleteTimeEntry(id)
  })

  ipcMain.handle(
    'time-entries:create-time-entry',
    (_, taskId: number, date: number, duration: number) => {
      return db.createTimeEntry(taskId, date, duration)
    }
  )

  ipcMain.handle('window:resize', (_, height: number) => {
    if (!popover) return
    const minHeight = 100
    const maxHeight = 500
    const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight)
    const { width } = popover.getBounds()
    popover.setSize(width, clampedHeight)
    positionPopover()
  })

  createTray()
  createPopover()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createPopover()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
