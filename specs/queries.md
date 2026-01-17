# Queries

Database operations in `src/main/database.ts`. All functions are synchronous (better-sqlite3).

## Initialization

```typescript
function initializeDatabase(): Database.Database
```

Creates tables if they don't exist, enables foreign keys, returns database instance.

Called once at app startup.

## Tasks

### getAllTasks

```typescript
function getAllTasks(): Task[]
```

Returns all tasks, sorted by `created_at DESC` (newest first).

```sql
SELECT * FROM tasks ORDER BY created_at DESC
```

### getTaskById

```typescript
function getTaskById(id: number): Task | undefined
```

Returns single task or undefined if not found.

```sql
SELECT * FROM tasks WHERE id = ?
```

### createTask

```typescript
function createTask(name: string): Task
```

Creates task with current timestamp, returns the created task.

```sql
INSERT INTO tasks (name, created_at) VALUES (?, ?)
```

### updateTask

```typescript
function updateTask(id: number, name: string): void
```

Updates task name.

```sql
UPDATE tasks SET name = ? WHERE id = ?
```

### deleteTask

```typescript
function deleteTask(id: number): void
```

Deletes task. Time entries cascade delete via foreign key.

```sql
DELETE FROM tasks WHERE id = ?
```

## Time Entries

### getAllTimeEntries

```typescript
function getAllTimeEntries(): TimeEntry[]
```

Returns all time entries (no filtering).

```sql
SELECT * FROM time_entries
```

### getTimeEntryById

```typescript
function getTimeEntryById(id: number): TimeEntry | undefined
```

Returns single entry or undefined.

```sql
SELECT * FROM time_entries WHERE id = ?
```

### getTimeEntriesByDate

```typescript
function getTimeEntriesByDate(date: number): TimeEntry[]
```

Returns entries for a specific day (midnight timestamp).

```sql
SELECT * FROM time_entries WHERE date = ?
```

### getTimeEntriesForToday

```typescript
function getTimeEntriesForToday(): TimeEntry[]
```

Convenience wrapper — calls `getTimeEntriesByDate` with today's midnight timestamp.

### getTimeEntriesByRange

```typescript
function getTimeEntriesByRange(startDate: number, endDate: number): TimeEntry[]
```

Returns entries within date range (inclusive start, exclusive end).

```sql
SELECT * FROM time_entries WHERE date >= ? AND date < ?
```

### getTimeEntriesByWeek

```typescript
function getTimeEntriesByWeek(startDate: number): TimeEntry[]
```

Returns entries for 7 days starting from `startDate`.

Calls `getTimeEntriesByRange(startDate, startDate + 7 days)`.

### getTimeEntriesByMonth

```typescript
function getTimeEntriesByMonth(startDate: number): TimeEntry[]
```

Returns entries for the calendar month containing `startDate`.

Calls `getTimeEntriesByRange(startDate, firstDayOfNextMonth)`.

### createTimeEntry

```typescript
function createTimeEntry(taskId: number, date: number, duration: number): TimeEntry
```

Creates or updates entry. Uses upsert — if entry exists for task+date, adds to duration.

```sql
INSERT INTO time_entries (task_id, date, duration)
VALUES (?, ?, ?)
ON CONFLICT(task_id, date) DO UPDATE SET duration = duration + excluded.duration
RETURNING *
```

### updateTimeEntry

```typescript
function updateTimeEntry(id: number, taskId: number, date: number, duration: number): void
```

Full update of an entry (used by activity log inline editing).

```sql
UPDATE time_entries SET task_id = ?, date = ?, duration = ? WHERE id = ?
```

### updateTimeEntryDuration

```typescript
function updateTimeEntryDuration(id: number, duration: number): void
```

Updates only duration (simpler than full update).

```sql
UPDATE time_entries SET duration = ? WHERE id = ?
```

### deleteTimeEntry

```typescript
function deleteTimeEntry(id: number): void
```

Deletes single entry.

```sql
DELETE FROM time_entries WHERE id = ?
```

### confirmTask

```typescript
function confirmTask(taskId: number): TimeEntry
```

**Core prompt action.** Adds 1200 seconds (20 min) to task for today. Upserts — creates entry if none exists.

```sql
INSERT INTO time_entries (task_id, date, duration)
VALUES (?, ?, 1200)
ON CONFLICT(task_id, date) DO UPDATE SET duration = duration + 1200
RETURNING *
```

## Settings

### getSetting

```typescript
function getSetting(key: string): any | null
```

Returns parsed JSON value or null if not found.

```sql
SELECT value FROM settings WHERE key = ?
```

### setSetting

```typescript
function setSetting(key: string, value: any): void
```

Sets or updates a setting. Value is JSON-encoded.

```sql
INSERT INTO settings (key, value)
VALUES (?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value
```

## Helper Functions

### getMidnightTimestamp

```typescript
function getMidnightTimestamp(date: Date = new Date()): number
```

Returns unix timestamp for midnight of the given date (local timezone).

```typescript
const d = new Date(date)
d.setHours(0, 0, 0, 0)
return Math.floor(d.getTime() / 1000)
```

### nowTimestamp

```typescript
function nowTimestamp(): number
```

Returns current unix timestamp in seconds.

```typescript
return Math.floor(Date.now() / 1000)
```

## Design Notes

**Why synchronous?**
better-sqlite3 is synchronous by design. For a local desktop app with small data volumes, this is simpler and faster than async. No callback hell, no await chains.

**Why upsert for time entries?**
The accumulation model. Multiple confirms throughout the day should add up, not overwrite. `ON CONFLICT ... DO UPDATE SET duration = duration + excluded.duration` handles this atomically.

**Why RETURNING?**
Avoids a second query to fetch the created/updated row. SQLite 3.35+ supports this.
