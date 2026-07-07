-- Migration 0005: Remove email and staff_id from users table
-- username is now the sole identifier for staff/admin (same as staff_id was).
-- Applied directly to production DB by recreating the table (SQLite cannot
-- DROP columns with UNIQUE constraints).

-- Step 1: Drop indexes that block column removal
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_staff_id;

-- Step 2: Recreate users table without email and staff_id
ALTER TABLE users RENAME TO users_old;

CREATE TABLE users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  username              TEXT    NOT NULL UNIQUE,  -- staff ID (e.g. "1891") or matric no
  password_hash         TEXT    NOT NULL,
  role                  TEXT    NOT NULL DEFAULT 'student',
  is_approved           INTEGER NOT NULL DEFAULT 0,
  must_change_password  INTEGER NOT NULL DEFAULT 0,
  first_name            TEXT    NOT NULL DEFAULT '',
  last_name             TEXT    NOT NULL DEFAULT '',
  student_profile_id    INTEGER,
  pin_hash              TEXT,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(role IN ('admin', 'instructor', 'student'))
);

INSERT INTO users (id, username, password_hash, role, is_approved, must_change_password,
                   first_name, last_name, student_profile_id, pin_hash, created_at, updated_at)
SELECT              id, username, password_hash, role, is_approved, must_change_password,
                   first_name, last_name, student_profile_id, pin_hash, created_at, updated_at
FROM users_old;

DROP TABLE users_old;
