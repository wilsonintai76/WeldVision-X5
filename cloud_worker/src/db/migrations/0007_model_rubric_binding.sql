-- Migration 0007: Model ↔ Rubric relational binding
-- Adds:
--   1. model_rubrics junction table (AI model bound to rubric, with is_default flag)
--   2. Context columns on assessment_rubrics (material, joint type, weld process)
--   3. rubric_id on assessments (records which rubric scored each coupon)
-- Run with:
--   wrangler d1 execute DB --file=src/db/migrations/0007_model_rubric_binding.sql

-- 1. Bind AI models to assessment rubrics.
--    A model may have many rubrics (one per material/joint combo).
--    is_default = 1 → automatically selected when this model scores a new assessment.
--    UNIQUE(model_id, rubric_id) prevents duplicate pairs.
CREATE TABLE IF NOT EXISTS model_rubrics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id    INTEGER NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  rubric_id   INTEGER NOT NULL REFERENCES assessment_rubrics(id) ON DELETE CASCADE,
  is_default  INTEGER NOT NULL DEFAULT 0,  -- 1 = auto-selected during scoring
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(model_id, rubric_id)
);

CREATE INDEX IF NOT EXISTS idx_model_rubrics_model  ON model_rubrics(model_id);
CREATE INDEX IF NOT EXISTS idx_model_rubrics_rubric ON model_rubrics(rubric_id);

-- 2. Describe what each rubric applies to.
--    e.g. material_type='cast_iron', joint_type='butt', weld_process='SMAW'
ALTER TABLE assessment_rubrics ADD COLUMN material_type TEXT NOT NULL DEFAULT '';
ALTER TABLE assessment_rubrics ADD COLUMN joint_type    TEXT NOT NULL DEFAULT '';
ALTER TABLE assessment_rubrics ADD COLUMN weld_process  TEXT NOT NULL DEFAULT '';

-- 3. Record which rubric scored each assessment.
--    NULL means scored with legacy hardcoded thresholds (before this migration).
ALTER TABLE assessments ADD COLUMN rubric_id INTEGER REFERENCES assessment_rubrics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_rubric ON assessments(rubric_id);
