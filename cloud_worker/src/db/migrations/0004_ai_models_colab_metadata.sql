-- Migration 0004: Add Colab training metadata columns to ai_models
-- Adds: epochs, dataset_version, map50, map50_95, model_size_bytes, compiling status
-- Run with: wrangler d1 execute inspect-able-db --file=src/db/migrations/0004_ai_models_colab_metadata.sql

ALTER TABLE ai_models ADD COLUMN epochs          INTEGER;
ALTER TABLE ai_models ADD COLUMN dataset_version TEXT    NOT NULL DEFAULT '';
ALTER TABLE ai_models ADD COLUMN map50           REAL;
ALTER TABLE ai_models ADD COLUMN map50_95        REAL;
ALTER TABLE ai_models ADD COLUMN model_size_bytes INTEGER;

-- Expand the status CHECK to include 'compiling' and 'failed'
-- SQLite does not support ALTER TABLE … ALTER COLUMN, so we recreate the table.
-- The approach: rename, create new, copy, drop old.
ALTER TABLE ai_models RENAME TO ai_models_old;

CREATE TABLE ai_models (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  version             TEXT    NOT NULL UNIQUE,
  description         TEXT    NOT NULL DEFAULT '',
  model_file_key      TEXT,
  status              TEXT    NOT NULL DEFAULT 'uploaded',
  is_deployed         INTEGER NOT NULL DEFAULT 0,
  accuracy            REAL,
  precision_score     REAL,
  recall              REAL,
  f1_score            REAL,
  epochs              INTEGER,
  dataset_version     TEXT    NOT NULL DEFAULT '',
  map50               REAL,
  map50_95            REAL,
  model_size_bytes    INTEGER,
  deployed_at         TEXT,
  deployed_to_device  TEXT    NOT NULL DEFAULT '',
  framework_version   TEXT    NOT NULL DEFAULT '',
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK(status IN ('uploaded','compiling','compiled','deployed','inactive','testing','failed'))
);

INSERT INTO ai_models (
  id, name, version, description, model_file_key, status,
  is_deployed, accuracy, precision_score, recall, f1_score,
  deployed_at, deployed_to_device, framework_version,
  created_at, updated_at
)
SELECT
  id, name, version, description, model_file_key, status,
  is_deployed, accuracy, precision_score, recall, f1_score,
  deployed_at, deployed_to_device, framework_version,
  created_at, updated_at
FROM ai_models_old;

DROP TABLE ai_models_old;
