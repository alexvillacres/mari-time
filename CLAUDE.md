# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev              # Start dev server with HMR
bun run build            # Full build with typecheck
bun run build:mac        # Build macOS app
bun run build:win        # Build Windows app
bun run build:linux      # Build Linux packages

# Code quality
bun run lint             # ESLint with cache
bun run format           # Prettier (write mode)
bun run typecheck        # TypeScript check (all projects)
bun run typecheck:node   # TypeScript check (main/preload only)
bun run typecheck:web    # TypeScript check (renderer only)
```

## Architecture

Electron app with three process types:

- **Main** (`src/main/`) - Node.js process: window creation, app lifecycle, SQLite database via better-sqlite3
- **Preload** (`src/preload/`) - Bridge between main and renderer using contextBridge to expose `window.api.db`
- **Renderer** (`src/renderer/src/`) - React 19 UI with Tailwind CSS v4

### IPC Pattern

Database operations flow through IPC:

1. Renderer calls `window.api.db.methodName()`
2. Preload invokes `ipcRenderer.invoke('db:method-name')`
3. Main handles via `ipcMain.handle('db:method-name')` and executes SQLite query

### Path Aliases

- `@renderer/*` → `src/renderer/src/*` (configured in tsconfig.web.json and electron.vite.config.ts)

## Tech Stack

- **Electron 39** with electron-vite for build tooling
- **React 19** with TypeScript
- **Tailwind CSS v4** with `@theme inline` configuration (no tailwind.config.js)
- **shadcn/ui** components in `src/renderer/src/components/ui/`
- **better-sqlite3** for local database at `userData/mari-time.db`

## Code Style

- Single quotes, no semicolons, 100 char width (Prettier)
- 2-space indentation
- Use `cn()` from `@renderer/lib/utils` for conditional Tailwind classes
