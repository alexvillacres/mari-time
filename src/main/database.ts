import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

interface Task {
  id: number
  name: string
  created_at: string
  updated_at: string
}

interface TimeEntry {
  id: number
  task_id: number
  date: string
  duration: number
}

let db: Database.Database | null = null

export function initializeDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'mari-time.db')

  db = new Database(dbPath)

  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
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

// Tasks

export function getAllTasks(): Task[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks')
  return stmt.all() as Task[]
}

export function getTaskById(id: number): Task | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return stmt.get(id) as Task | undefined
}

export function createTask(name: string): Task {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO tasks (name, created_at, updated_at) VALUES (?, ?, ?)')
  const result = stmt.run(name, new Date().toISOString(), new Date().toISOString())
  return getTaskById(result.lastInsertRowid as number)!
}

export function updateTask(id: number, name: string): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE tasks SET name = ?, updated_at = ? WHERE id = ?')
  stmt.run(name, new Date().toISOString(), id)
}

export function deleteTask(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  stmt.run(id)
}

// Time Entries

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

export function createTimeEntry(taskId: number, date: string, duration: number): TimeEntry {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO time_entries (task_id, date, duration) VALUES (?, ?, ?)')
  const result = stmt.run(taskId, date, duration)
  return getTimeEntryById(result.lastInsertRowid as number)!
}

export function updateTimeEntry(id: number, taskId: number, date: string, duration: number): void {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE time_entries SET task_id = ?, date = ?, duration = ? WHERE id = ?'
  )
  stmt.run(taskId, date, duration, id)
}

export function deleteTimeEntry(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM time_entries WHERE id = ?')
  stmt.run(id)
}

export function getTimeEntriesByDay(date: string): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date = ?')
  return stmt.all(date) as TimeEntry[]
}

export function getTimeEntriesByWeek(startDate: string): TimeEntry[] {
  const db = getDatabase()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 7)
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date >= ? AND date < ?')
  return stmt.all(startDate, endDate.toISOString().split('T')[0]) as TimeEntry[]
}

export function getTimeEntriesByMonth(startDate: string): TimeEntry[] {
  const db = getDatabase()
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1)
  const stmt = db.prepare('SELECT * FROM time_entries WHERE date >= ? AND date < ?')
  return stmt.all(startDate, endDate.toISOString().split('T')[0]) as TimeEntry[]
}
