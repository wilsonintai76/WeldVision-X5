-- Migration 0006: Merge first_name + last_name into a single name column
-- Applied in v1.1.38
-- IMPORTANT: This migration was applied directly via wrangler CLI before deploying v1.1.38.
-- It is kept here for documentation purposes only. Do NOT re-run.

ALTER TABLE users RENAME TO users_old;

CREATE TABLE users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  username              TEXT    NOT NULL UNIQUE,
  password_hash         TEXT    NOT NULL,
  name                  TEXT    NOT NULL DEFAULT '',
  role                  TEXT    NOT NULL DEFAULT 'student',
  is_approved           INTEGER NOT NULL DEFAULT 0,
  must_change_password  INTEGER NOT NULL DEFAULT 0,
  student_profile_id    INTEGER,
  pin_hash              TEXT,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(role IN ('admin', 'instructor', 'student'))
);

INSERT INTO users (id, username, password_hash, name, role, is_approved, must_change_password, student_profile_id, pin_hash, created_at, updated_at)
SELECT id, username, password_hash,
  TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
  role, is_approved, must_change_password, student_profile_id, pin_hash, created_at, updated_at
FROM users_old;

DROP TABLE users_old;
