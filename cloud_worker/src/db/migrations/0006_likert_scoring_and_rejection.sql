-- Migration 0006: Likert scoring columns and manual rejection support
-- Adds grade_band, rejected, and rejection_reason to assessments table

ALTER TABLE assessments ADD COLUMN grade_band       TEXT    NOT NULL DEFAULT '';
ALTER TABLE assessments ADD COLUMN rejected         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN rejection_reason TEXT    NOT NULL DEFAULT '';
