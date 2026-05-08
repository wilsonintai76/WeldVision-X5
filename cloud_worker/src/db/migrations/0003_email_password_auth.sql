-- Migration 0003: Email + password auth for students
-- Drops PIN-based auth in favour of unified email+PBKDF2 password for all accounts.

-- Add password_hash column to students (nullable — populated lazily on first admin reset)
ALTER TABLE students ADD COLUMN password_hash TEXT;

-- Index for fast lookup by email on both tables (login path)
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
