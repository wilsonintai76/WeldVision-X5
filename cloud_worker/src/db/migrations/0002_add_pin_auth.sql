-- Migration 0002 — Add PIN-based authentication for students and staff
-- Run: npx wrangler d1 execute weldvision --remote --file src/db/migrations/0002_add_pin_auth.sql

-- Add staff_id (login identifier) and pin_hash to users table (instructors/admin)
-- Note: SQLite does not support ADD COLUMN with UNIQUE; create the index separately.
ALTER TABLE users ADD COLUMN staff_id TEXT;
ALTER TABLE users ADD COLUMN pin_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id) WHERE staff_id IS NOT NULL;

-- Add pin_hash to students table (direct student login)
ALTER TABLE students ADD COLUMN pin_hash TEXT;
