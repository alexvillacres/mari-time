import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, screen } from 'electron'
import { join } from 'path'
import * as db from './database'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/menu-bar-icon.png?asset'

let tray: Tray | null = null
let activityLogWindow: BrowserWindow | null = null
let promptWindow: BrowserWindow | null = null
let currentTaskId: number | null = null
let intervalId: NodeJS.Timeout | null = null
let promptTimeoutId: NodeJS.Timeout | null = null

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
    if (!activityLogWindow) return
    if (activityLogWindow.isVisible()) {
      activityLogWindow.hide()
    } else {
      positionActivityLogWindow()
      activityLogWindow.show()
      activityLogWindow.focus()
    }
  })
}

function createActivityLogWindow(): BrowserWindow {
  activityLogWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    minWidth: 300,
    minHeight: 200,
    maxWidth: 500,
    maxHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Lower z-order than prompt
  activityLogWindow.setAlwaysOnTop(true, 'pop-up-menu')

  positionActivityLogWindow()

  // Reposition on resize
  activityLogWindow.on('resize', positionActivityLogWindow)

  activityLogWindow.on('ready-to-show', () => {
    activityLogWindow?.show()
  })

  activityLogWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    activityLogWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=activity-log`)
  } else {
    activityLogWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { view: 'activity-log' }
    })
  }

  activityLogWindow.on('blur', () => {
    // Small delay to allow internal focus changes (like clicking inputs)
    setTimeout(() => {
      if (!activityLogWindow?.isFocused()) {
        activityLogWindow?.hide()
      }
    }, 100)
  })

  return activityLogWindow
}

function createPromptWindow(): BrowserWindow {
  promptWindow = new BrowserWindow({
    width: 300,
    height: 250,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Higher z-order than activity log
  promptWindow.setAlwaysOnTop(true, 'floating')

  promptWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    promptWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?view=prompt`)
  } else {
    promptWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { view: 'prompt' }
    })
  }

  promptWindow.on('blur', () => {
    // Small delay to allow internal focus changes
    setTimeout(() => {
      if (promptWindow && !promptWindow.isFocused() && promptWindow.isVisible()) {
        handlePromptResolution('confirm')
      }
    }, 100)
  })

  return promptWindow
}

function positionActivityLogWindow(): void {
  if (!activityLogWindow) return
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const workArea = display.workArea
  const bounds = activityLogWindow.getBounds()
  const x = workArea.x + screenWidth - bounds.width - 8
  const y = workArea.y + 8
  activityLogWindow.setPosition(x, y)
}

function positionPromptWindow(): void {
  if (!promptWindow) return
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const workArea = display.workArea
  const bounds = promptWindow.getBounds()
  const x = workArea.x + screenWidth - bounds.width - 8
  const y = workArea.y + 8
  promptWindow.setPosition(x, y)
}

// Timer functions
function startTimer(): void {
  intervalId = setInterval(handleInterval, 20 * 60 * 1000) // 20 minutes
}

function handleInterval(): void {
  if (shouldSuppress()) {
    if (currentTaskId) {
      db.confirmTask(currentTaskId)
      console.log('[Timer] Suppressed, auto-confirmed task:', currentTaskId)
    }
    return
  }
  showPromptWindow()
}

function shouldSuppress(): boolean {
  return activityLogWindow?.isVisible() ?? false
}

function showPromptWindow(): void {
  if (!promptWindow) return
  positionPromptWindow()
  promptWindow.show()
  promptWindow.focus()

  // 10-second auto-dismiss (confirms current task)
  promptTimeoutId = setTimeout(() => {
    handlePromptResolution('confirm')
  }, 10000)
}

function hidePromptWindow(): void {
  if (promptTimeoutId) {
    clearTimeout(promptTimeoutId)
    promptTimeoutId = null
  }
  promptWindow?.hide()
}

function handlePromptResolution(action: string, taskId?: number): void {
  hidePromptWindow()

  if (action === 'confirm' && currentTaskId) {
    db.confirmTask(currentTaskId)
    console.log('[Prompt] Confirmed task:', currentTaskId)
  } else if (action === 'switch' && taskId) {
    db.confirmTask(taskId)
    currentTaskId = taskId
    db.setSetting('current_task_id', taskId)
    console.log('[Prompt] Switched to task:', taskId)
  }
  // 'deny' = no action, just hide
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  db.initializeDatabase()

  // Load persisted current task
  currentTaskId = db.getSetting('current_task_id') as number | null
  console.log('[App] Loaded current_task_id:', currentTaskId)

  // Task IPC handlers
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

  // Time entry IPC handlers
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

  // Window IPC handlers
  ipcMain.handle('window:resize', (_, height: number) => {
    if (!activityLogWindow) return
    const minHeight = 100
    const maxHeight = 500
    const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight)
    const { width } = activityLogWindow.getBounds()
    activityLogWindow.setSize(width, clampedHeight)
    positionActivityLogWindow()
  })

  // Settings IPC handlers
  ipcMain.handle('settings:get', (_, key: string) => {
    return db.getSetting(key)
  })

  ipcMain.handle('settings:set', (_, key: string, value: unknown) => {
    db.setSetting(key, value)
  })

  // Prompt IPC handlers
  ipcMain.handle('prompt:get-state', () => {
    return { currentTaskId }
  })

  ipcMain.handle('prompt:resolve', (_, action: string, taskId?: number) => {
    handlePromptResolution(action, taskId)
  })

  createTray()
  createActivityLogWindow()
  createPromptWindow()

  // Start 20-minute timer
  startTimer()
  console.log('[Timer] Started 20-minute interval')

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createActivityLogWindow()
      createPromptWindow()
    }
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

// Cleanup on quit
app.on('will-quit', () => {
  if (intervalId) {
    clearInterval(intervalId)
  }
  if (promptTimeoutId) {
    clearTimeout(promptTimeoutId)
  }
})
