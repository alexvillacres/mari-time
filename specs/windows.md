# Windows

Two windows: prompt (interval-triggered) and activity log (user-triggered). Both are frameless popovers anchored to the menu bar.

## Common Properties

Both windows share these characteristics:

| Property | Value | Reason |
|----------|-------|--------|
| `frame` | `false` | Clean popover aesthetic |
| `transparent` | `true` | Rounded corners, no window chrome |
| `alwaysOnTop` | `true` | Stay above other apps |
| `skipTaskbar` | `true` | Menu bar app, not in dock/taskbar |
| `movable` | `false` | Fixed position below tray |
| `show` | `false` | Created hidden, shown programmatically |
| `webPreferences.preload` | Preload script path | IPC bridge |

## Prompt Window

Appears every 20 minutes (unless suppressed). Small, focused, fast to dismiss.

### Config

```typescript
const promptWindow = new BrowserWindow({
  width: 300,
  height: 250,
  frame: false,
  transparent: true,
  resizable: false,
  movable: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  show: false,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js')
  }
})
```

### Behavior

| Event | Action |
|-------|--------|
| Timer fires | Show window, start 10s timeout |
| Timeout (10s) | Hide, confirm current task |
| Blur | Hide, confirm current task |
| `Cmd+Enter` | Hide, confirm current task |
| `Esc` | Hide, deny (no time logged) |
| Task selected | Hide, switch to selected task |

### Positioning

Top-right of primary display, below menu bar:

```typescript
function positionPromptWindow(): void {
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const workArea = display.workArea
  const bounds = promptWindow.getBounds()

  const x = workArea.x + screenWidth - bounds.width - 8
  const y = workArea.y + 8

  promptWindow.setPosition(x, y)
}
```

## Activity Log Window

Opened via tray click. Shows daily time entries.

### Config

```typescript
const activityLogWindow = new BrowserWindow({
  width: 400,
  height: 300,
  frame: false,
  transparent: true,
  resizable: true,
  movable: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  show: false,
  minWidth: 300,
  minHeight: 200,
  maxWidth: 500,
  maxHeight: 600,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js')
  }
})
```

### Behavior

| Event | Action |
|-------|--------|
| Tray click (hidden) | Show window |
| Tray click (visible) | Hide window |
| Blur | Hide window |
| `Esc` | Hide window |
| Resize | Reposition to stay anchored to top-right |

### Positioning

Same as prompt — top-right of primary display:

```typescript
function positionActivityLogWindow(): void {
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const workArea = display.workArea
  const bounds = activityLogWindow.getBounds()

  const x = workArea.x + screenWidth - bounds.width - 8
  const y = workArea.y + 8

  activityLogWindow.setPosition(x, y)
}
```

### Dynamic Resize

Activity log can be resized by the user. On resize, reposition to keep top-right anchor:

```typescript
activityLogWindow.on('resize', () => {
  positionActivityLogWindow()
})
```

Also supports programmatic resize via IPC (e.g., content-based height adjustment):

```typescript
ipcMain.handle('window:resize', (_, height: number) => {
  const minHeight = 100
  const maxHeight = 500
  const clamped = Math.min(Math.max(height, minHeight), maxHeight)
  const { width } = activityLogWindow.getBounds()
  activityLogWindow.setSize(width, clamped)
  positionActivityLogWindow()
})
```

## Window Routing

Both windows load the same renderer entry point. The renderer determines which view to show based on a query param or IPC message.

**Option A: Query param**
```typescript
// Main
promptWindow.loadURL(`${baseURL}?view=prompt`)
activityLogWindow.loadURL(`${baseURL}?view=activity-log`)

// Renderer
const view = new URLSearchParams(window.location.search).get('view')
```

**Option B: IPC on show**
```typescript
// Main
promptWindow.webContents.send('set-view', 'prompt')

// Renderer
ipcRenderer.on('set-view', (_, view) => setCurrentView(view))
```

Recommend Option A for simplicity — view is determined once at load, no state sync needed.

## Blur Handling

Both windows hide on blur, but with a small delay to allow internal focus changes:

```typescript
window.on('blur', () => {
  setTimeout(() => {
    if (!window.isFocused()) {
      window.hide()
      // For prompt: also trigger confirm/timeout logic
    }
  }, 100)
})
```

The 100ms delay prevents hiding when clicking between inputs within the window.

## Z-Order

If both windows are somehow visible simultaneously (edge case), prompt should be on top:

```typescript
promptWindow.setAlwaysOnTop(true, 'floating')
activityLogWindow.setAlwaysOnTop(true, 'pop-up-menu')
```

macOS levels: `floating` > `pop-up-menu`.

## Focus Behavior

When showing a window:

```typescript
function showWindow(win: BrowserWindow): void {
  positionWindow(win)
  win.show()
  win.focus()
}
```

Always focus after show to ensure keyboard shortcuts work.
