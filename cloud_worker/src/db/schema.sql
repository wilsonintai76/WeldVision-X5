-- =============================================================
-- WeldVision Cloud - D1 SQLite Schema  (v2 — normalized)
-- All JSON blobs replaced with proper relational tables.
-- RPC queries in src/routes/rpc.ts aggregate across these tables.
-- =============================================================

-- Users (replaces Django auth + accounts.User)
CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  username              TEXT    NOT NULL UNIQUE,
  email                 TEXT    NOT NULL UNIQUE,
  password_hash         TEXT    NOT NULL,
  role                  TEXT    NOT NULL DEFAULT 'student',
  is_approved           INTEGER NOT NULL DEFAULT 0,
  must_change_password  INTEGER NOT NULL DEFAULT 0,
  first_name            TEXT    NOT NULL DEFAULT '',
  last_name             TEXT    NOT NULL DEFAULT '',
  student_profile_id    INTEGER,
  staff_id              TEXT    UNIQUE,   -- staff/admin login identifier (e.g. "WS001")
  pin_hash              TEXT,             -- PBKDF2 4-digit PIN (replaces password for staff login)
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(role IN ('admin', 'instructor', 'student'))
);

-- Class groups (home classes, e.g. DKM5A)
CREATE TABLE IF NOT EXISTS class_groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Instructor → class_group assignments (many-to-many)
CREATE TABLE IF NOT EXISTS user_classes (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_group_id INTEGER NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, class_group_id)
);

-- Academic sessions (e.g. "2:2025/2026")
CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  start_date TEXT,
  end_date   TEXT,
  is_active  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Courses (e.g. DJJ40173 - ENGINEERING DESIGN)
CREATE TABLE IF NOT EXISTS courses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  section       TEXT    NOT NULL DEFAULT '',
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description   TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code, section, session_id)
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  class_group_id INTEGER REFERENCES class_groups(id) ON DELETE SET NULL,
  email          TEXT,
  pin_hash       TEXT,             -- PBKDF2 4-digit PIN for direct student login
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Student ↔ course enrolment (many-to-many)
CREATE TABLE IF NOT EXISTS student_courses (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, course_id)
);

-- Defect label classes (e.g. porosity, crack)
CREATE TABLE IF NOT EXISTS defect_classes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#3B82F6',
  description  TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stereo camera calibration configs
CREATE TABLE IF NOT EXISTS stereo_calibrations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL UNIQUE,
  image_width      INTEGER NOT NULL DEFAULT 1280,
  image_height     INTEGER NOT NULL DEFAULT 720,
  board_width      INTEGER NOT NULL DEFAULT 9,
  board_height     INTEGER NOT NULL DEFAULT 6,
  square_size_mm   REAL    NOT NULL DEFAULT 25.0,
  calibration_data TEXT,   -- JSON blob
  is_active        INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Weld assessments (results from edge device)
CREATE TABLE IF NOT EXISTS assessments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id           INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  timestamp           TEXT    NOT NULL DEFAULT (datetime('now')),
  final_score         REAL,
  image_original_key  TEXT,   -- R2 object key
  image_heatmap_key   TEXT,   -- R2 object key
  notes               TEXT    NOT NULL DEFAULT '',
  device_id           TEXT    NOT NULL DEFAULT '',
  model_version       TEXT    NOT NULL DEFAULT '',
  pointcloud_ply_key  TEXT,   -- R2 object key
  mesh_preview_json   TEXT,   -- large 3D point cloud (kept as JSON TEXT)
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Normalized weld measurement metrics  (replaces metrics_json blob)
-- Each physical measurement from the edge device becomes one row.
-- Examples: 'geometric.bead_width_mm', 'geometric.reinforcement_height_mm',
--           'visual.porosity_count', 'visual.spatter_count'
CREATE TABLE IF NOT EXISTS assessment_metrics (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id  INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  metric_key     TEXT    NOT NULL,
  metric_value   REAL,           -- numeric measurement
  metric_text    TEXT,           -- string value (non-numeric)
  metric_unit    TEXT    NOT NULL DEFAULT '',
  UNIQUE(assessment_id, metric_key)
);

-- AI defect detections per assessment  (replaces ai_evaluation_json blob)
-- One row per defect class detected by Workers AI.
-- bbox_* are normalised 0-1 coords (null when model only gives aggregate counts).
CREATE TABLE IF NOT EXISTS assessment_detections (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id    INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  defect_class_id  INTEGER REFERENCES defect_classes(id) ON DELETE SET NULL,
  defect_name      TEXT    NOT NULL DEFAULT '',  -- snapshot in case class deleted
  count            INTEGER NOT NULL DEFAULT 1,
  confidence       REAL    NOT NULL DEFAULT 0.0,
  severity         TEXT    NOT NULL DEFAULT 'low',
  bbox_x           REAL,   -- bounding box normalised 0-1 (null for aggregate detections)
  bbox_y           REAL,
  bbox_w           REAL,
  bbox_h           REAL,
  depth_mm         REAL,   -- from stereo depth
  area_mm2         REAL,   -- estimated defect area
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(severity IN ('low', 'medium', 'high', 'critical'))
);

-- Assessment rubrics (grading templates)
CREATE TABLE IF NOT EXISTS assessment_rubrics (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL UNIQUE,
  description   TEXT    NOT NULL DEFAULT '',
  rubric_type   TEXT    NOT NULL DEFAULT 'custom',
  is_active     INTEGER NOT NULL DEFAULT 0,
  passing_score REAL    NOT NULL DEFAULT 3.0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(rubric_type IN ('iso_5817', 'aws_d1_1', 'custom'))
);

-- Individual rubric criteria (Likert 1-5)
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  rubric_id            INTEGER NOT NULL REFERENCES assessment_rubrics(id) ON DELETE CASCADE,
  name                 TEXT    NOT NULL,
  category             TEXT    NOT NULL DEFAULT 'visual',
  weight               REAL    NOT NULL DEFAULT 1.0,
  display_order        INTEGER NOT NULL DEFAULT 0,
  score_1_label        TEXT    NOT NULL DEFAULT 'Poor',
  score_1_description  TEXT    NOT NULL DEFAULT '',
  score_2_label        TEXT    NOT NULL DEFAULT 'Below Average',
  score_2_description  TEXT    NOT NULL DEFAULT '',
  score_3_label        TEXT    NOT NULL DEFAULT 'Acceptable',
  score_3_description  TEXT    NOT NULL DEFAULT '',
  score_4_label        TEXT    NOT NULL DEFAULT 'Good',
  score_4_description  TEXT    NOT NULL DEFAULT '',
  score_5_label        TEXT    NOT NULL DEFAULT 'Excellent',
  score_5_description  TEXT    NOT NULL DEFAULT '',
  UNIQUE(rubric_id, name),
  CHECK(category IN ('geometric', 'visual', 'technique', 'safety'))
);

-- Student evaluation records
CREATE TABLE IF NOT EXISTS student_evaluations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  rubric_id        INTEGER REFERENCES assessment_rubrics(id) ON DELETE SET NULL,
  assessment_id    INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  evaluator        TEXT    NOT NULL DEFAULT '',
  total_score      REAL    NOT NULL DEFAULT 0,
  passed           INTEGER NOT NULL DEFAULT 0,
  session_start    TEXT,
  session_end      TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes            TEXT    NOT NULL DEFAULT '',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Per-criterion score within an evaluation
CREATE TABLE IF NOT EXISTS criterion_scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL REFERENCES student_evaluations(id) ON DELETE CASCADE,
  criterion_id  INTEGER NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL,
  notes         TEXT    NOT NULL DEFAULT '',
  UNIQUE(evaluation_id, criterion_id),
  CHECK(score BETWEEN 1 AND 5)
);

-- AI model registry (MLOps)
CREATE TABLE IF NOT EXISTS ai_models (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT    NOT NULL,
  version            TEXT    NOT NULL UNIQUE,
  description        TEXT    NOT NULL DEFAULT '',
  model_file_key     TEXT,   -- R2 object key
  status             TEXT    NOT NULL DEFAULT 'uploaded',
  is_deployed        INTEGER NOT NULL DEFAULT 0,
  accuracy           REAL,
  precision_score    REAL,
  recall             REAL,
  f1_score           REAL,
  deployed_at        TEXT,
  deployed_to_device TEXT    NOT NULL DEFAULT '',
  framework_version  TEXT    NOT NULL DEFAULT '',
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(status IN ('uploaded', 'deployed', 'inactive', 'testing'))
);

-- ── Indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assessments_student      ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course       ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_timestamp    ON assessments(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_assessment       ON assessment_metrics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_metrics_key              ON assessment_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_detections_assessment    ON assessment_detections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_detections_defect_class  ON assessment_detections(defect_class_id);
CREATE INDEX IF NOT EXISTS idx_students_class           ON students(class_group_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id      ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_student      ON student_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created      ON student_evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_criterion_scores_eval    ON criterion_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric   ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_courses_session          ON courses(session_id);
