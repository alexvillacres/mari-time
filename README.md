# Mari

A passive time-tracking menu bar app that makes tracking effortless. Confirm what you're working on with a single keystroke—or let it auto-track while you stay in flow.

## Features

- **Passive tracking** — Prompts every 20 minutes; silence means "keep going"
- **Keyboard-first** — Enter to confirm, Esc to skip, type to switch tasks
- **Activity log** — Review and edit your day's work from the menu bar
- **Simple data model** — One entry per task per day, duration-based

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mari-time.git
cd mari-time

# Install dependencies
bun install

# Run in development
bun run dev

# Build for production
bun run build
```

## Usage

1. Mari runs in your system tray
2. Every 20 minutes, a prompt appears with your last task
3. **CMD + Enter** — Confirm and add 20 minutes
4. **Esc** — Dismiss without logging
5. **Type** — Switch to a different task
6. Click the tray icon anytime to view/edit your activity log

## Tech Stack

- Electron + electron-builder
- React + TypeScript
- SQLite via better-sqlite3
- Tailwind + shadcn/ui

## Project Structure

src/
├── main/ # Electron main process
├── renderer/ # React UI (prompt + activity log)
└── preload/ # Context bridge

## Specs

Design documentation lives in specs/. See specs/README.md for a complete index organized by category:

- Architecture
- Features
- Data

## Roadmap

- [ ] MVP: Prompt + Activity Log
- [ ] Export (CSV: Summary, Timesheet, Daily)
- [ ] Projects as parent entities
- [ ] Idle detection
- [ ] Configurable intervals

## License

MIT
