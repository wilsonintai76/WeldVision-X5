import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';

const rubrics = new Hono<{ Bindings: Env }>();

function isAdminOrInstructor(role: string) {
  return role === 'admin' || role === 'instructor';
}

// ── ASSESSMENT RUBRICS (/api/rubrics) ─────────────────────────────────────────

rubrics.get('/', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM assessment_rubrics ORDER BY is_active DESC, created_at DESC')
    .all();
  return c.json(rows.results);
});

rubrics.get('/active', async (c) => {
  const rubric = await c.env.DB
    .prepare('SELECT * FROM assessment_rubrics WHERE is_active = 1 LIMIT 1')
    .first<{ id: number }>();
  if (!rubric) return c.json({ error: 'No active rubric' }, 404);

  const criteria = await c.env.DB
    .prepare('SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY display_order, name')
    .bind(rubric.id)
    .all();
  return c.json({ ...rubric, criteria: criteria.results });
});

rubrics.get('/:id', async (c) => {
  const rubric = await c.env.DB
    .prepare('SELECT * FROM assessment_rubrics WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ id: number }>();
  if (!rubric) return c.json({ error: 'Not found' }, 404);

  const criteria = await c.env.DB
    .prepare('SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY display_order, name')
    .bind(c.req.param('id'))
    .all();
  return c.json({ ...rubric, criteria: criteria.results });
});

rubrics.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const {
    name, description = '', rubric_type = 'custom',
    is_active = false, passing_score = 3.0,
  } = await c.req.json<{
    name?: string; description?: string; rubric_type?: string;
    is_active?: boolean; passing_score?: number;
  }>();
  if (!name) return c.json({ error: 'name is required' }, 400);

  if (is_active) {
    await c.env.DB.prepare('UPDATE assessment_rubrics SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  const result = await c.env.DB
    .prepare('INSERT INTO assessment_rubrics (name, description, rubric_type, is_active, passing_score) VALUES (?, ?, ?, ?, ?)')
    .bind(name, description, rubric_type, is_active ? 1 : 0, passing_score)
    .run();
  return c.json({ id: result.meta.last_row_id, name }, 201);
});

rubrics.put('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, description = '', rubric_type = 'custom', is_active = false, passing_score = 3.0 } =
    await c.req.json<{
      name?: string; description?: string; rubric_type?: string;
      is_active?: boolean; passing_score?: number;
    }>();

  if (is_active) {
    await c.env.DB.prepare('UPDATE assessment_rubrics SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  await c.env.DB
    .prepare('UPDATE assessment_rubrics SET name=?, description=?, rubric_type=?, is_active=?, passing_score=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(name, description, rubric_type, is_active ? 1 : 0, passing_score, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

rubrics.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM assessment_rubrics WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── POST /api/rubrics/create-iso-5817 ────────────────────────────────────────
// Creates an ISO 5817 standard welding quality rubric with predefined criteria.
// Must be defined BEFORE /:id routes to avoid the literal path being captured
// by the :id wildcard.

rubrics.post('/create-iso-5817', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  // Deactivate all existing rubrics first if requested
  await c.env.DB.prepare("UPDATE assessment_rubrics SET is_active = 0, updated_at = datetime('now')").run();

  const result = await c.env.DB.prepare(`
    INSERT INTO assessment_rubrics (name, description, rubric_type, is_active, passing_score)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    'ISO 5817 Welding Quality',
    'Standard welding quality rubric based on ISO 5817 — Quality levels for imperfections in fusion welding of metals.',
    'iso_5817',
    1,
    3.0,
  ).run();

  const rubricId = result.meta.last_row_id;

  const criteria = [
    { name: 'Weld Bead', category: 'dimensional', w: 1.0, order: 1,
      l1: 'Grossly irregular bead', l2: 'Significant irregularity', l3: 'Moderate uniformity', l4: 'Near-uniform bead', l5: 'Uniform and consistent bead' },
    { name: 'Undercut', category: 'dimensional', w: 1.5, order: 2,
      l1: '>1mm deep undercut', l2: '0.5-1mm undercut', l3: '0.3-0.5mm undercut', l4: '<0.3mm undercut', l5: 'No undercut' },
    { name: 'Cracks', category: 'structural', w: 2.5, order: 3,
      l1: 'Multiple cracks visible', l2: '2-3 cracks present', l3: '1 crack detected', l4: 'Micro-crack suspected', l5: 'No cracks' },
    { name: 'Lack of Fusion', category: 'structural', w: 2.0, order: 4,
      l1: 'No fusion on edges', l2: 'Large unfused area', l3: 'Small unfused zone', l4: 'Marginal fusion issue', l5: 'Complete fusion' },
    { name: 'Spatter', category: 'visual', w: 1.0, order: 5,
      l1: 'Heavy spatter all around', l2: 'Multiple large spatter', l3: 'Some spatter', l4: 'Minimal spatter', l5: 'No spatter' },
    { name: 'Porosity', category: 'structural', w: 1.5, order: 6,
      l1: '>5 pores visible', l2: '3-5 pores', l3: '1-2 pores', l4: 'Micro-porosity only', l5: 'No porosity' },
    { name: 'Reinforcement Height', category: 'dimensional', w: 1.0, order: 7,
      l1: '>4mm (excessive)', l2: '3-4mm over spec', l3: '2-3mm (borderline)', l4: '1-2mm (acceptable)', l5: '1-3mm (within AWS D11.2)' },
  ];

  const stmt = c.env.DB.prepare(`
    INSERT INTO rubric_criteria
      (rubric_id, name, category, weight, display_order,
       score_1_label, score_2_label, score_3_label, score_4_label, score_5_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const cr of criteria) {
    await stmt.bind(rubricId, cr.name, cr.category, cr.w, cr.order,
      cr.l1, cr.l2, cr.l3, cr.l4, cr.l5).run();
  }

  return c.json({ id: rubricId, message: 'ISO 5817 rubric created', criteria_count: criteria.length }, 201);
});

// ── POST /api/rubrics/:id/activate ───────────────────────────────────────────

rubrics.post('/:id/activate', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id');

  // Deactivate all, then activate the requested one
  await c.env.DB.prepare("UPDATE assessment_rubrics SET is_active = 0, updated_at = datetime('now')").run();
  const result = await c.env.DB
    .prepare("UPDATE assessment_rubrics SET is_active = 1, updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();

  if (result.meta.changes === 0) return c.json({ error: 'Rubric not found' }, 404);
  return c.json({ message: 'Rubric activated' });
});

// ── RUBRIC CRITERIA (/api/rubrics/:id/criteria) ───────────────────────────────

rubrics.post('/:id/criteria', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    name, category = 'visual', weight = 1.0, display_order = 0,
    score_1_label = 'Poor', score_1_description = '',
    score_2_label = 'Below Average', score_2_description = '',
    score_3_label = 'Acceptable', score_3_description = '',
    score_4_label = 'Good', score_4_description = '',
    score_5_label = 'Excellent', score_5_description = '',
  } = body;
  if (!name) return c.json({ error: 'name is required' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO rubric_criteria
      (rubric_id, name, category, weight, display_order,
       score_1_label, score_1_description, score_2_label, score_2_description,
       score_3_label, score_3_description, score_4_label, score_4_description,
       score_5_label, score_5_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    c.req.param('id'), name, category, weight, display_order,
    score_1_label, score_1_description,
    score_2_label, score_2_description,
    score_3_label, score_3_description,
    score_4_label, score_4_description,
    score_5_label, score_5_description,
  ).run();
  return c.json({ id: result.meta.last_row_id, name, category }, 201);
});

rubrics.put('/criteria/:criterionId', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    name, category, weight, display_order,
    score_1_label, score_1_description,
    score_2_label, score_2_description,
    score_3_label, score_3_description,
    score_4_label, score_4_description,
    score_5_label, score_5_description,
  } = body;

  await c.env.DB.prepare(`
    UPDATE rubric_criteria SET
      name=?, category=?, weight=?, display_order=?,
      score_1_label=?, score_1_description=?,
      score_2_label=?, score_2_description=?,
      score_3_label=?, score_3_description=?,
      score_4_label=?, score_4_description=?,
      score_5_label=?, score_5_description=?
    WHERE id=?
  `).bind(
    name, category, weight, display_order,
    score_1_label, score_1_description,
    score_2_label, score_2_description,
    score_3_label, score_3_description,
    score_4_label, score_4_description,
    score_5_label, score_5_description,
    c.req.param('criterionId'),
  ).run();
  return c.json({ message: 'Updated' });
});

rubrics.delete('/criteria/:criterionId', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB
    .prepare('DELETE FROM rubric_criteria WHERE id = ?')
    .bind(c.req.param('criterionId'))
    .run();
  return c.json({ message: 'Deleted' });
});

// ── STUDENT EVALUATIONS (/api/evaluations) ────────────────────────────────────

rubrics.get('/evaluations', async (c) => {
  const { student_id, limit = '20', offset = '0' } = c.req.query();

  let sql = `
    SELECT e.*, s.name AS student_name, s.student_id AS student_code, r.name AS rubric_name
    FROM student_evaluations e
    JOIN students s ON e.student_id = s.id
    LEFT JOIN assessment_rubrics r ON e.rubric_id = r.id
  `;
  const params: unknown[] = [];
  if (student_id) { sql += ' WHERE e.student_id = ?'; params.push(student_id); }
  sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(rows.results);
});

rubrics.get('/evaluations/:id', async (c) => {
  const evaluation = await c.env.DB.prepare(`
    SELECT e.*, s.name AS student_name, s.student_id AS student_code, r.name AS rubric_name
    FROM student_evaluations e
    JOIN students s ON e.student_id = s.id
    LEFT JOIN assessment_rubrics r ON e.rubric_id = r.id
    WHERE e.id = ?
  `).bind(c.req.param('id')).first();
  if (!evaluation) return c.json({ error: 'Not found' }, 404);

  const scores = await c.env.DB.prepare(`
    SELECT cs.*, rc.name AS criterion_name, rc.category, rc.weight
    FROM criterion_scores cs
    JOIN rubric_criteria rc ON cs.criterion_id = rc.id
    WHERE cs.evaluation_id = ?
    ORDER BY rc.display_order, rc.name
  `).bind(c.req.param('id')).all();

  return c.json({ ...evaluation, criterion_scores: scores.results });
});

rubrics.post('/evaluations', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<{
    student_id?: number; rubric_id?: number; assessment_id?: number;
    evaluator?: string; session_start?: string; session_end?: string;
    duration_seconds?: number; ai_metrics?: unknown; notes?: string;
    criterion_scores?: Array<{ criterion_id: number; score: number; notes?: string }>;
  }>();

  const { student_id, rubric_id, assessment_id, evaluator = '', session_start,
    session_end, duration_seconds = 0, ai_metrics, notes = '',
    criterion_scores = [] } = body;

  if (!student_id || !rubric_id) {
    return c.json({ error: 'student_id and rubric_id are required' }, 400);
  }

  // Fetch rubric passing threshold
  const rubricRow = await c.env.DB
    .prepare('SELECT passing_score FROM assessment_rubrics WHERE id = ?')
    .bind(rubric_id)
    .first<{ passing_score: number }>();
  const passingScore = rubricRow?.passing_score ?? 3.0;

  // Calculate weighted total score
  let totalScore = 0;
  let totalWeight = 0;

  if (criterion_scores.length > 0) {
    const placeholders = criterion_scores.map(() => '?').join(',');
    const criteriaRows = await c.env.DB
      .prepare(`SELECT id, weight FROM rubric_criteria WHERE id IN (${placeholders})`)
      .bind(...criterion_scores.map(cs => cs.criterion_id))
      .all<{ id: number; weight: number }>();

    const weightMap = new Map(criteriaRows.results.map(r => [r.id, r.weight]));
    for (const cs of criterion_scores) {
      const w = weightMap.get(cs.criterion_id) ?? 1.0;
      totalScore += cs.score * w;
      totalWeight += w;
    }
    if (totalWeight > 0) totalScore = totalScore / totalWeight;
  }

  const passed = totalScore >= passingScore;

  const result = await c.env.DB.prepare(`
    INSERT INTO student_evaluations
      (student_id, rubric_id, assessment_id, evaluator, total_score, passed,
       session_start, session_end, duration_seconds, ai_metrics, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    student_id, rubric_id, assessment_id ?? null, evaluator,
    Math.round(totalScore * 100) / 100, passed ? 1 : 0,
    session_start ?? null, session_end ?? null, duration_seconds,
    ai_metrics ? JSON.stringify(ai_metrics) : null, notes,
  ).run();

  const evalId = result.meta.last_row_id as number;

  // Insert criterion scores in a batch
  if (criterion_scores.length > 0) {
    const stmts = criterion_scores.map(cs =>
      c.env.DB
        .prepare('INSERT OR IGNORE INTO criterion_scores (evaluation_id, criterion_id, score, notes) VALUES (?, ?, ?, ?)')
        .bind(evalId, cs.criterion_id, cs.score, cs.notes ?? '')
    );
    await c.env.DB.batch(stmts);
  }

  return c.json({ id: evalId, total_score: totalScore, passed }, 201);
});

rubrics.delete('/evaluations/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM student_evaluations WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

export default rubrics;
