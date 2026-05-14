-- Migration 0005: Add missing columns to users table
-- 
-- The production users table was created from an older schema that lacked:
--   email, first_name, last_name, staff_id
-- The login handler queries these columns (staff_id for PIN path, email for
-- fallback PBKDF2 path), so ALL logins were returning 500.
--
-- Run: npx wrangler d1 execute weldvision --remote --file src/db/migrations/0005_fix_users_missing_columns.sql

-- Add missing columns (nullable — existing rows have no values for them)
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN staff_id TEXT;

-- Unique partial index on staff_id (matches auth.ts login Path 2)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id) WHERE staff_id IS NOT NULL;

-- Index on email for fast login lookups (auth.ts login Path 3)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Back-fill existing users: set staff_id = username (their login identifier),
-- synthesise an email, and split the legacy `name` column into first/last name.
UPDATE users
SET
  staff_id   = username,
  email      = username || '@weldvision.local',
  first_name = CASE
                 WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1)
                 ELSE name
               END,
  last_name  = CASE
                 WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1)
                 ELSE ''
               END
WHERE staff_id IS NULL;
