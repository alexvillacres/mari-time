# Schema

SQLite database stored at `userData/mari-time.db`.

## Tables

### tasks

| Column     | Type    | Constraints                  | Description                                 |
| ---------- | ------- | ---------------------------- | ------------------------------------------- |
| id         | INTEGER | PRIMARY KEY AUTOINCREMENT    |                                             |
| name       | TEXT    | NOT NULL                     | Task label shown in prompt and activity log |
| created_at | INTEGER | NOT NULL DEFAULT unixepoch() | Unix timestamp                              |

### time_entries

| Column   | Type    | Constraints                                | Description                         |
| -------- | ------- | ------------------------------------------ | ----------------------------------- |
| id       | INTEGER | PRIMARY KEY AUTOINCREMENT                  |                                     |
| task_id  | INTEGER | NOT NULL, FK → tasks(id) ON DELETE CASCADE |                                     |
| date     | INTEGER | NOT NULL                                   | Midnight unix timestamp for the day |
| duration | INTEGER | NOT NULL DEFAULT 0                         | Total seconds logged                |

### settings

| Column | Type | Constraints | Description        |
| ------ | ---- | ----------- | ------------------ |
| key    | TEXT | PRIMARY KEY | Setting identifier |
| value  | TEXT |             | JSON-encoded value |

Single-row key-value store for app state. Known keys:

| Key               | Value Type     | Description                                             |
| ----------------- | -------------- | ------------------------------------------------------- |
| `current_task_id` | number \| null | Last confirmed/switched task; null only on first launch |

## Constraints & Indexes

- `UNIQUE(task_id, date)` — One entry per task per day; enables upsert pattern
- `INDEX idx_time_entries_date` — Fast daily lookups
- `FOREIGN KEY ... ON DELETE CASCADE` — Deleting a task removes all its entries

## Design Rationale

**Unix timestamps over ISO strings**
Simpler arithmetic, consistent sorting, no timezone parsing.

**Duration in seconds**
Granular enough for any interval. Default prompt adds 1200 seconds (20 min).

**Accumulation model**
Each prompt confirmation upserts: inserts new entry or adds to existing duration. One row per task per day keeps the table small.

**Tasks are permanent**
No soft delete or archive flag. Tasks persist until explicitly removed via a future settings feature. "Removing" a task from the activity log just zeros its duration for that day.

## Future Considerations

- `color TEXT` on tasks — For visual distinction in UI
- `project_id INTEGER` on tasks — With new `projects` table for grouping
