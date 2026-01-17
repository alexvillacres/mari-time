import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

interface Task {
  id: number
  name: string
  created_at: number
}

interface TimeEntry {
  id: number
  task_id: number
  date: number
  duration: number
}

let db: Database.Database | null = null

export function initializeDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'mari-time.db')

  console.log('[DB] Initializing database at:', dbPath)

  db = new Database(dbPath)

  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        date INTEGER NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE (task_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
    `)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

function getMidnightTimestamp(date: Date = new Date()): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}

// Tasks

export function getAllTasks(): Task[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  return stmt.all() as Task[]
}

export function getTaskById(id: number): Task | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return stmt.get(id) as Task | undefined
}

export function createTask(name: string): Task {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO tasks (name, created_at) VALUES (?, ?)')
  const result = stmt.run(name, nowTimestamp())
  return getTaskById(result.lastInsertRowid as number)!
}

export function updateTask(id: number, name: string): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE tasks SET name = ? WHERE id = ?')
  stmt.run(name, id)
}

export function deleteTask(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  stmt.run(id)
}

// time entries & prompt handling
export function getAllTimeEntries(): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries')
  return stmt.all() as TimeEntry[]
}

export function getTimeEntryById(id: number): TimeEntry | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE id = ?')
  return stmt.get(id) as TimeEntry | undefined
}

export function getTimeEntriesByDate(date: number): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date = ?')
  return stmt.all(date) as TimeEntry[]
}

export function getTimeEntriesForToday(): TimeEntry[] {
  return getTimeEntriesByDate(getMidnightTimestamp())
}

export function updateTimeEntry(id: number, taskId: number, date: string, duration: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE time_entries SET task_id = ?, date = ?, duration = ? WHERE id = ?'
  )
  stmt.run(taskId, date, duration, id)
}

export function getTimeEntriesByDay(date: string): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date = ?')
  return stmt.all(date) as TimeEntry[]
}

export function getTimeEntriesByWeek(startDate: number): TimeEntry[] {
  const endDate = startDate + 7 * 24 * 60 * 60
  return getTimeEntriesByRange(startDate, endDate)
}

export function getTimeEntriesByMonth(startDate: number): TimeEntry[] {
  const d = new Date(startDate * 1000)
  d.setMonth(d.getMonth() + 1)
  const endDate = Math.floor(d.getTime() / 1000)
  return getTimeEntriesByRange(startDate, endDate)
}

export function getTimeEntriesByRange(startDate: number, endDate: number): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date >= ? AND date < ?')
  return stmt.all(startDate, endDate) as TimeEntry[]
}

// Core prompt action: upserts 20 min to task for today
export function confirmTask(taskId: number): TimeEntry {
  const db = getDatabase()
  const today = getMidnightTimestamp()

  const stmt = db.prepare(`
    INSERT INTO time_entries (task_id, date, duration)
    VALUES (?, ?, 1200)
    ON CONFLICT(task_id, date) DO UPDATE SET duration = duration + 1200
    RETURNING *
  `)

  return stmt.get(taskId, today) as TimeEntry
}

// Manual adjustments
export function updateTimeEntryDuration(id: number, duration: number): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE time_entries SET duration = ? WHERE id = ?')
  stmt.run(duration, id)
}

export function deleteTimeEntry(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM time_entries WHERE id = ?')
  stmt.run(id)
}

// Manual entry creation (from activity log)
export function createTimeEntry(taskId: number, date: number, duration: number): TimeEntry {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO time_entries (task_id, date, duration)
    VALUES (?, ?, ?)
    ON CONFLICT(task_id, date) DO UPDATE SET duration = duration + excluded.duration
    RETURNING *
  `)
  return stmt.get(taskId, date, duration) as TimeEntry
}
