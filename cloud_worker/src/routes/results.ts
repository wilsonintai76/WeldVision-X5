import { Hono } from 'hono';
import { Env, JWTPayload, AssessmentRow } from '../types';
import { evaluateWeldImage, WeldEvaluation } from '../ai/evaluate';

const results = new Hono<{ Bindings: Env }>();

// ── Likert rubric scoring (§5.5, Table 1) ────────────────────────────────────

interface LikertResult {
  total_score: number;
  grade_band: string;
  likert_scores: {
    weld_width: number;
    reinforcement_height: number;
    undercut_depth: number;
    spatter_count: number;
    porosity_count: number;
    width_uniformity: number;
    height_uniformity: number;
  };
}

function likertWeldWidth(mm: number): number {
  if (mm >= 7 && mm <= 8) return 5;
  if ((mm >= 6.6 && mm <= 6.9) || (mm >= 8.1 && mm <= 8.4)) return 4;
  if ((mm >= 6.0 && mm <= 6.5) || (mm >= 8.5 && mm <= 9.0)) return 3;
  if ((mm >= 5.0 && mm <= 5.9) || (mm >= 9.1 && mm <= 10.0)) return 2;
  return 1;
}

function likertReinforcementHeight(mm: number): number {
  if (mm >= 2.0 && mm <= 3.0) return 5;
  if ((mm >= 1.6 && mm <= 1.9) || (mm >= 3.1 && mm <= 3.4)) return 4;
  if ((mm >= 1.0 && mm <= 1.5) || (mm >= 3.5 && mm <= 4.0)) return 3;
  if ((mm >= 0.1 && mm <= 0.9) || (mm >= 4.1 && mm < 5.0)) return 2;
  return 1; // ≤0 or ≥5
}

function likertUndercutDepth(mm: number): number {
  if (mm <= 0.2) return 5;
  if (mm <= 0.5) return 4;
  if (mm <= 0.9) return 3;
  if (mm <= 1.4) return 2;
  return 1; // ≥1.5
}

function likertSpatterCount(n: number): number {
  if (n === 0) return 5;
  if (n <= 2) return 4;
  if (n <= 5) return 3;
  if (n <= 10) return 2;
  return 1;
}

function likertPorosityCount(n: number): number {
  if (n === 0) return 5;
  if (n === 1) return 4;
  if (n === 2) return 3;
  if (n <= 5) return 2;
  return 1;
}

function likertWidthUniformity(std: number): number {
  if (std <= 0.4) return 5;
  if (std <= 0.9) return 4;
  if (std <= 1.5) return 3;
  if (std <= 2.4) return 2;
  return 1; // ≥2.5
}

function likertHeightUniformity(std: number): number {
  if (std <= 0.2) return 5;
  if (std <= 0.5) return 4;
  if (std <= 1.0) return 3;
  if (std <= 1.9) return 2;
  return 1; // ≥2.0
}

function toGradeBand(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Implements the 7-criterion Likert rubric engine from §5.5.
 * Accepts both paper-spec flat keys (avg_width, max_reinforcement, …)
 * and the legacy nested format (geometric.bead_width_mm, visual.spatter_count, …).
 * Formula: Score = Σ((Likert_i − 1)/4 × Weight_i × 100)
 */
function calculateLikertScore(metrics: Record<string, unknown>): LikertResult {
  const geo = (metrics.geometric ?? {}) as Record<string, number>;
  const vis = (metrics.visual   ?? {}) as Record<string, number>;

  const avgWidth    = (metrics.avg_width         as number) ?? geo.bead_width_mm          ?? 7.0;
  const maxReinf    = (metrics.max_reinforcement  as number) ?? geo.reinforcement_height_mm ?? 2.5;
  const maxUndercut = (metrics.max_undercut       as number) ?? geo.undercut_depth_mm      ?? 0.0;
  const spatter     = (metrics.spatter_count      as number) ?? vis.spatter_count          ?? 0;
  const porosity    = (metrics.porosity_count     as number) ?? vis.porosity_count         ?? 0;
  const stdWidth    = (metrics.std_width          as number) ?? geo.std_width_mm           ?? 0.0;
  const stdHeight   = (metrics.std_height         as number) ?? geo.std_height_mm          ?? 0.0;

  const scores = {
    weld_width:           likertWeldWidth(avgWidth),
    reinforcement_height: likertReinforcementHeight(maxReinf),
    undercut_depth:       likertUndercutDepth(maxUndercut),
    spatter_count:        likertSpatterCount(spatter),
    porosity_count:       likertPorosityCount(porosity),
    width_uniformity:     likertWidthUniformity(stdWidth),
    height_uniformity:    likertHeightUniformity(stdHeight),
  };

  const WEIGHTS: Record<keyof typeof scores, number> = {
    weld_width:           0.20,
    reinforcement_height: 0.25,
    undercut_depth:       0.20,
    spatter_count:        0.10,
    porosity_count:       0.10,
    width_uniformity:     0.10,
    height_uniformity:    0.05,
  };

  let total = 0;
  for (const key of Object.keys(scores) as Array<keyof typeof scores>) {
    total += ((scores[key] - 1) / 4) * WEIGHTS[key] * 100;
  }
  const totalScore = Math.round(total * 10) / 10;

  return { total_score: totalScore, grade_band: toGradeBand(totalScore), likert_scores: scores };
}

// ── Persist Likert scores → assessment_metrics rows ──────────────────────────

async function insertLikertMetrics(
  db: D1Database,
  assessmentId: number,
  result: LikertResult
): Promise<void> {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)'
  );
  const numericEntries = Object.entries(result.likert_scores).map(([key, val]) =>
    stmt.bind(assessmentId, `rubric.${key}.likert`, val, null, '')
  );
  await db.batch([
    ...numericEntries,
    stmt.bind(assessmentId, 'rubric.total_score', result.total_score, null, ''),
    stmt.bind(assessmentId, 'rubric.grade_band', null, result.grade_band, ''),
  ]);
}

// ── Flatten metrics object → assessment_metrics rows ─────────────────────────
// Converts nested { geometric: { bead_width_mm: 10 } } to flat key 'geometric.bead_width_mm'

async function insertMetrics(
  db: D1Database,
  assessmentId: number,
  metrics: Record<string, unknown>
): Promise<void> {
  type MetricRow = [string, number | null, string | null, string];
  const rows: MetricRow[] = [];

  function flatten(obj: Record<string, unknown>, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, fullKey);
      } else if (typeof value === 'number') {
        rows.push([fullKey, value, null, '']);
      } else if (typeof value === 'string') {
        rows.push([fullKey, null, value, '']);
      }
    }
  }

  flatten(metrics, '');
  if (rows.length === 0) return;

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)'
  );
  await db.batch(rows.map(([key, val, text, unit]) =>
    stmt.bind(assessmentId, key, val, text, unit)
  ));
}

// ── Store AI detections → assessment_detections rows ─────────────────────────

async function storeDetections(
  db: D1Database,
  assessmentId: number,
  ev: WeldEvaluation
): Promise<void> {
  type DetectionEntry = { name: string; count: number };
  const entries: DetectionEntry[] = [
    { name: 'porosity',       count: ev.porosity_count },
    { name: 'spatter',        count: ev.spatter_count },
    { name: 'cracks',         count: ev.crack_count },
    ...(ev.undercut_present      ? [{ name: 'undercut',        count: 1 }] : []),
    ...(ev.lack_of_fusion_present ? [{ name: 'lack_of_fusion', count: 1 }] : []),
  ].filter(e => e.count > 0);

  if (entries.length === 0) return;

  const severity = (conf: number) =>
    conf >= 0.85 ? 'critical' : conf >= 0.65 ? 'high' : conf >= 0.40 ? 'medium' : 'low';

  const stmt = db.prepare(`
    INSERT INTO assessment_detections
      (assessment_id, defect_name, count, confidence, severity)
    VALUES (?, ?, ?, ?, ?)
  `);
  await db.batch(entries.map(e =>
    stmt.bind(assessmentId, e.name, e.count, ev.confidence, severity(ev.confidence))
  ));

  // Also persist the AI quality scores as metrics
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)').bind(assessmentId, 'ai.overall_quality',  ev.overall_quality,       null, ''),
    db.prepare('INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)').bind(assessmentId, 'ai.bead_uniformity',  ev.weld_bead_uniformity,  null, ''),
    db.prepare('INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)').bind(assessmentId, 'ai.visual_score',     ev.visual_score,          null, ''),
    db.prepare('INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)').bind(assessmentId, 'ai.confidence',       ev.confidence,            null, ''),
    db.prepare('INSERT OR REPLACE INTO assessment_metrics (assessment_id, metric_key, metric_value, metric_text, metric_unit) VALUES (?, ?, ?, ?, ?)').bind(assessmentId, 'ai.description',      null, ev.description,       ''),
  ]);
}

// ── Resolve rubric from model binding ─────────────────────────────────────────
// Given a model_version string, finds the deployed model record and returns
// the rubric_id of its default binding (or null if none configured).

async function resolveRubricId(db: D1Database, modelVersion: string): Promise<number | null> {
  if (!modelVersion) return null;
  const row = await db.prepare(`
    SELECT mr.rubric_id
    FROM model_rubrics mr
    JOIN ai_models m ON m.id = mr.model_id
    WHERE m.version = ? AND mr.is_default = 1
    LIMIT 1
  `).bind(modelVersion).first<{ rubric_id: number }>();
  return row?.rubric_id ?? null;
}

// ── Background AI evaluation ──────────────────────────────────────────────────

async function runAIEvaluation(assessmentId: number, imageKey: string, env: Env) {
  try {
    const obj = await env.STORAGE.get(imageKey);
    if (!obj) return;
    const buffer = await obj.arrayBuffer();
    const evaluation = await evaluateWeldImage(env.AI, buffer);
    await storeDetections(env.DB, assessmentId, evaluation);
  } catch (err) {
    console.error('[AI] Background evaluation error:', err);
  }
}

// ── GET /api/assessments ──────────────────────────────────────────────────────

results.get('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const { student_id, limit = '20', offset = '0' } = c.req.query();

  let sql = `
    SELECT a.*, s.name AS student_name, s.student_id AS student_code
    FROM assessments a
    JOIN students s ON a.student_id = s.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (payload.role === 'student') {
    // Students see only their own assessments
    const userRow = await c.env.DB
      .prepare('SELECT student_profile_id FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<{ student_profile_id: number | null }>();
    if (!userRow?.student_profile_id) return c.json([]);
    conditions.push('a.student_id = ?');
    params.push(userRow.student_profile_id);
  } else if (student_id) {
    conditions.push('a.student_id = ?');
    params.push(student_id);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(rows.results);
});

// ── GET /api/assessments/:id ──────────────────────────────────────────────────

results.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(`
    SELECT a.*, s.name AS student_name, s.student_id AS student_code
    FROM assessments a
    JOIN students s ON a.student_id = s.id
    WHERE a.id = ?
  `).bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── GET /api/assessments/:id/mesh-preview ─────────────────────────────────────

results.get('/:id/mesh-preview', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT mesh_preview_json FROM assessments WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ mesh_preview_json: string | null }>();
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (!row.mesh_preview_json) return c.json({ error: 'No mesh preview available' }, 404);
  return c.json(JSON.parse(row.mesh_preview_json));
});

// ── GET /api/assessments/:id/download-ply ────────────────────────────────────

results.get('/:id/download-ply', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT pointcloud_ply_key FROM assessments WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ pointcloud_ply_key: string | null }>();
  if (!row?.pointcloud_ply_key) return c.json({ error: 'No point cloud available' }, 404);

  const obj = await c.env.STORAGE.get(row.pointcloud_ply_key);
  if (!obj) return c.json({ error: 'File not found in storage' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="pointcloud_${c.req.param('id')}.ply"`);
  return new Response(obj.body, { headers });
});

// ── POST /api/assessments (JSON body, R2 keys already uploaded) ───────────────

results.post('/', async (c) => {
  const body = await c.req.json<{
    student_id?: number;
    course_id?: number;
    metrics?: Record<string, unknown>;
    notes?: string;
    device_id?: string;
    model_version?: string;
    image_original_key?: string;
    image_heatmap_key?: string;
    pointcloud_ply_key?: string;
    mesh_preview_json?: unknown;
  }>();

  if (!body.student_id) return c.json({ error: 'student_id is required' }, 400);

  const student = await c.env.DB
    .prepare('SELECT id FROM students WHERE id = ?')
    .bind(body.student_id)
    .first();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const metrics = body.metrics ?? {};
  const likertResult = calculateLikertScore(metrics);
  const rubricId = await resolveRubricId(c.env.DB, body.model_version ?? '');

  const result = await c.env.DB.prepare(`
    INSERT INTO assessments
      (student_id, course_id, final_score, grade_band, image_original_key, image_heatmap_key,
       notes, device_id, model_version, pointcloud_ply_key, mesh_preview_json, rubric_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.student_id,
    body.course_id ?? null,
    likertResult.total_score,
    likertResult.grade_band,
    body.image_original_key ?? null,
    body.image_heatmap_key ?? null,
    body.notes ?? '',
    body.device_id ?? '',
    body.model_version ?? '',
    body.pointcloud_ply_key ?? null,
    body.mesh_preview_json ? JSON.stringify(body.mesh_preview_json) : null,
    rubricId,
  ).run();

  const assessmentId = result.meta.last_row_id as number;

  // Persist edge-device metrics and Likert rubric scores into normalized table
  if (Object.keys(metrics).length > 0) {
    c.executionCtx.waitUntil(insertMetrics(c.env.DB, assessmentId, metrics));
  }
  c.executionCtx.waitUntil(insertLikertMetrics(c.env.DB, assessmentId, likertResult));

  if (body.image_original_key) {
    c.executionCtx.waitUntil(runAIEvaluation(assessmentId, body.image_original_key, c.env));
  }

  return c.json({
    id: assessmentId,
    final_score: likertResult.total_score,
    grade_band: likertResult.grade_band,
    rubric_id: rubricId,
    likert_scores: likertResult.likert_scores,
  }, 201);
});

// ── POST /api/upload-assessment (multipart — legacy edge device format) ────────

results.post('/upload-assessment', async (c) => {
  const form = await c.req.formData();

  const rawStudentId = form.get('student_id') as string | null;
  if (!rawStudentId) return c.json({ error: 'student_id is required' }, 400);

  // Accept both numeric id and student_id string
  const student = await c.env.DB.prepare(`
    SELECT id FROM students WHERE student_id = ? OR CAST(id AS TEXT) = ?
  `).bind(rawStudentId, rawStudentId).first<{ id: number }>();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const deviceId = (form.get('device_id') as string) ?? '';
  const modelVersion = (form.get('model_version') as string) ?? '';
  let metrics: Record<string, unknown> = {};
  try { metrics = JSON.parse((form.get('metrics_json') as string) ?? '{}'); } catch {}

  const now = new Date().toISOString().replace(/[:.]/g, '-');

  async function storeFile(field: string, folder: string, mimeDefault: string): Promise<string | null> {
    const file = form.get(field) as File | null;
    if (!file) return null;
    const key = `${folder}/${now}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await c.env.STORAGE.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || mimeDefault },
    });
    return key;
  }

  const [imageOriginalKey, imageHeatmapKey, pointcloudKey] = await Promise.all([
    storeFile('image_original', 'assessments/original', 'image/jpeg'),
    storeFile('image_heatmap', 'assessments/heatmap', 'image/jpeg'),
    storeFile('pointcloud_ply', 'assessments/pointclouds', 'application/octet-stream'),
  ]);

  const finalScore = calculateLikertScore(metrics);
  const rubricId = await resolveRubricId(c.env.DB, modelVersion);

  const result = await c.env.DB.prepare(`
    INSERT INTO assessments
      (student_id, final_score, grade_band, image_original_key, image_heatmap_key,
       device_id, model_version, pointcloud_ply_key, rubric_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(student.id, finalScore.total_score, finalScore.grade_band,
    imageOriginalKey, imageHeatmapKey, deviceId, modelVersion, pointcloudKey, rubricId).run();

  const assessmentId = result.meta.last_row_id as number;

  if (Object.keys(metrics).length > 0) {
    c.executionCtx.waitUntil(insertMetrics(c.env.DB, assessmentId, metrics));
  }
  c.executionCtx.waitUntil(insertLikertMetrics(c.env.DB, assessmentId, finalScore));
  if (imageOriginalKey) {
    c.executionCtx.waitUntil(runAIEvaluation(assessmentId, imageOriginalKey, c.env));
  }

  return c.json({
    id: assessmentId,
    final_score: finalScore.total_score,
    grade_band: finalScore.grade_band,
    rubric_id: rubricId,
    likert_scores: finalScore.likert_scores,
  }, 201);
});

// ── GET /api/assessments/:id/metrics ─────────────────────────────────────────

results.get('/:id/metrics', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT metric_key, metric_value, metric_text, metric_unit FROM assessment_metrics WHERE assessment_id = ? ORDER BY metric_key'
  ).bind(c.req.param('id')).all();
  return c.json(rows.results);
});

// ── GET /api/assessments/:id/detections ──────────────────────────────────────

results.get('/:id/detections', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT ad.*, dc.display_name, dc.color
    FROM assessment_detections ad
    LEFT JOIN defect_classes dc ON dc.id = ad.defect_class_id
    WHERE ad.assessment_id = ?
    ORDER BY ad.count DESC
  `).bind(c.req.param('id')).all();
  return c.json(rows.results);
});

// ── PATCH /api/assessments/:id/reject ────────────────────────────────────────

results.patch('/:id/reject', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const row = await c.env.DB
    .prepare('SELECT id FROM assessments WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Not found' }, 404);

  const { reason = '' } = await c.req.json<{ reason?: string }>();

  await c.env.DB
    .prepare('UPDATE assessments SET rejected = 1, rejection_reason = ? WHERE id = ?')
    .bind(reason, c.req.param('id'))
    .run();

  return c.json({ message: 'Rejected – pending further NDT' });
});

// ── DELETE /api/assessments/:id ───────────────────────────────────────────────

results.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const row = await c.env.DB
    .prepare('SELECT image_original_key, image_heatmap_key, pointcloud_ply_key FROM assessments WHERE id = ?')
    .bind(c.req.param('id'))
    .first<Pick<AssessmentRow, 'image_original_key' | 'image_heatmap_key' | 'pointcloud_ply_key'>>();

  if (row) {
    const keys = [row.image_original_key, row.image_heatmap_key, row.pointcloud_ply_key].filter(Boolean) as string[];
    await Promise.all(keys.map(k => c.env.STORAGE.delete(k)));
  }

  await c.env.DB.prepare('DELETE FROM assessments WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

export default results;
