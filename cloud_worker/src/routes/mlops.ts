import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';

const mlops = new Hono<{ Bindings: Env }>();

// ── GET /api/models ───────────────────────────────────────────────────────────

mlops.get('/', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM ai_models ORDER BY created_at DESC')
    .all();
  return c.json(rows.results);
});

// ── GET /api/models/deployed ──────────────────────────────────────────────────

mlops.get('/deployed', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM ai_models WHERE is_deployed = 1 ORDER BY deployed_at DESC LIMIT 1')
    .first();
  if (!row) return c.json({ error: 'No model currently deployed' }, 404);
  return c.json(row);
});

// ── GET /api/models/next-version ────────────────────────────────────────────
// Returns the auto-assigned name and next version number for the next upload.

mlops.get('/next-version', async (c) => {
  const latest = await c.env.DB
    .prepare("SELECT version FROM ai_models WHERE name = 'yolov8_weld' ORDER BY id DESC LIMIT 1")
    .first<{ version: string }>();
  const nextNum = latest ? (parseInt(latest.version.replace(/\D/g, ''), 10) || 0) + 1 : 1;
  return c.json({ name: 'yolov8_weld', next_version: `v${nextNum}` });
});

// ── GET /api/models/:id ───────────────────────────────────────────────────────

mlops.get('/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM ai_models WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── POST /api/models (register metadata; file uploaded separately via /api/storage) ──
// Accepts full Colab training metadata alongside the ONNX key.

mlops.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const {
    description = '',
    model_file_key,
    status = 'uploaded',
    // Legacy field aliases (still accepted for backwards compat)
    accuracy,
    precision_score,
    recall,
    f1_score,
    // New Colab metadata fields
    map50,
    map50_95,
    epochs,
    dataset_version = '',
    model_size_bytes,
    framework_version = '',
  } = await c.req.json<{
    description?: string;
    model_file_key?: string;
    status?: string;
    accuracy?: number;
    precision_score?: number;
    recall?: number;
    f1_score?: number;
    map50?: number;
    map50_95?: number;
    epochs?: number;
    dataset_version?: string;
    model_size_bytes?: number;
    framework_version?: string;
  }>();

  if (!model_file_key) return c.json({ error: 'model_file_key is required' }, 400);
  if (!model_file_key.endsWith('.onnx')) {
    return c.json({
      error: 'Only .onnx files are accepted. Export from Colab with model.export(format="onnx")',
    }, 400);
  }

  // Auto name and version
  const name = 'yolov8_weld';
  const latest = await c.env.DB
    .prepare("SELECT version FROM ai_models WHERE name = 'yolov8_weld' ORDER BY id DESC LIMIT 1")
    .first<{ version: string }>();
  const nextNum = latest ? (parseInt(latest.version.replace(/\D/g, ''), 10) || 0) + 1 : 1;
  const version = `v${nextNum}`;

  // mAP50 is the primary accuracy signal from YOLOv8; mirror it into the
  // legacy `accuracy` column so older queries continue to work unchanged.
  const resolvedAccuracy = map50 ?? accuracy ?? null;

  const result = await c.env.DB.prepare(`
    INSERT INTO ai_models
      (name, version, description, model_file_key, status,
       accuracy, precision_score, recall, f1_score,
       map50, map50_95, epochs, dataset_version, model_size_bytes,
       framework_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name, version, description, model_file_key, status,
    resolvedAccuracy, precision_score ?? null, recall ?? null, f1_score ?? null,
    map50 ?? null, map50_95 ?? null, epochs ?? null, dataset_version, model_size_bytes ?? null,
    framework_version,
  ).run();

  return c.json({ id: result.meta.last_row_id, name, version, status }, 201);
});

// ── PATCH /api/models/:id  (update metadata / metrics) ───────────────────────

mlops.patch('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const body = await c.req.json<Record<string, unknown>>();
  const updates: string[] = [];
  const values: unknown[] = [];

  const allowed = [
    'name', 'description', 'status', 'model_file_key',
    'accuracy', 'precision_score', 'recall', 'f1_score',
    'map50', 'map50_95', 'epochs', 'dataset_version', 'model_size_bytes',
    'framework_version',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) { updates.push(`${key} = ?`); values.push(body[key]); }
  }
  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400);
  updates.push('updated_at = datetime(\'now\')');
  values.push(c.req.param('id'));

  await c.env.DB
    .prepare(`UPDATE ai_models SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
  return c.json({ message: 'Updated' });
});

// ── PATCH /api/models/:id/deploy ─────────────────────────────────────────────

mlops.patch('/:id/deploy', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const { device_id = '' } = await c.req.json<{ device_id?: string }>().catch(() => ({ device_id: '' }));

  // Mark all others inactive
  await c.env.DB
    .prepare('UPDATE ai_models SET is_deployed = 0, status = \'inactive\', updated_at = datetime(\'now\') WHERE is_deployed = 1')
    .run();

  // Deploy this one
  await c.env.DB.prepare(`
    UPDATE ai_models
    SET is_deployed = 1, status = 'deployed', deployed_at = datetime('now'),
        deployed_to_device = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(device_id, c.req.param('id')).run();

  return c.json({ message: 'Model deployed' });
});

// ── DELETE /api/models/:id ────────────────────────────────────────────────────

mlops.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const row = await c.env.DB
    .prepare('SELECT model_file_key FROM ai_models WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ model_file_key: string | null }>();

  if (row?.model_file_key) {
    await c.env.STORAGE.delete(row.model_file_key);
  }

  await c.env.DB.prepare('DELETE FROM ai_models WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── POST /api/models/github-compile ──────────────────────────────────────────
// Triggers the compile_model.yml GitHub Actions workflow.
// The workflow downloads the .onnx from R2, runs hb_mapper makertbin,
// and uploads the resulting .bin back to R2 as models/model_update.bin.
//
// Required GitHub secret in this worker: GITHUB_PAT
//   wrangler secret put GITHUB_PAT
//   (PAT needs: repo + workflow scopes)

mlops.post('/github-compile', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const { model_id } = await c.req.json<{ model_id?: number }>();
  if (!model_id) return c.json({ error: 'model_id is required' }, 400);

  const model = await c.env.DB
    .prepare('SELECT name, version, model_file_key FROM ai_models WHERE id = ?')
    .bind(model_id)
    .first<{ name: string; version: string; model_file_key: string | null }>();

  if (!model) return c.json({ error: 'Model not found' }, 404);
  if (!model.model_file_key) return c.json({ error: 'Model has no file attached' }, 400);
  if (!model.model_file_key.endsWith('.onnx')) {
    return c.json({ error: 'Only .onnx files can be compiled to Horizon .bin. Re-upload the model as .onnx.' }, 400);
  }

  const resp = await fetch(
    'https://api.github.com/repos/wilsonintai76/WeldVision-X5/actions/workflows/compile_model.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.GITHUB_PAT}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'WeldVision-Worker/1.0',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { model_r2_key: model.model_file_key, model_id: String(model_id) },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    return c.json({ error: `GitHub API error (${resp.status}): ${err}` }, 502);
  }

  // Mark model as compiling so the frontend can show progress
  await c.env.DB
    .prepare("UPDATE ai_models SET status = 'compiling', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(model_id)
    .run();

  return c.json({
    dispatched: true,
    model: `${model.name} ${model.version}`,
    r2_key: model.model_file_key,
  });
});

// ── POST /api/models/compile-callback ────────────────────────────────────────
// Called by GitHub Actions on workflow success or failure.
// Requires X-Compile-Secret header matching COMPILE_CALLBACK_SECRET env var.
mlops.post('/compile-callback', async (c) => {
  const secret = c.req.header('X-Compile-Secret');
  if (!c.env.COMPILE_CALLBACK_SECRET || secret !== c.env.COMPILE_CALLBACK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{
    model_id?: number;
    status?: string;
    bin_r2_key?: string;
    error?: string;
  }>();
  if (!body.model_id || !['compiled', 'failed'].includes(body.status ?? '')) {
    return c.json({ error: 'model_id and status (compiled|failed) required' }, 400);
  }

  const updates: string[] = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
  const values: unknown[] = [body.status];

  // If compiled successfully, store the .bin R2 key so the UI can show it
  if (body.status === 'compiled' && body.bin_r2_key) {
    updates.push("model_file_key = ?");
    values.push(body.bin_r2_key);
  }
  values.push(body.model_id);

  await c.env.DB
    .prepare(`UPDATE ai_models SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return c.json({ ok: true, model_id: body.model_id, status: body.status });
});

// ── GET /api/models/:id/rubrics ───────────────────────────────────────────────
// List all rubrics bound to this model (with rubric context metadata).

mlops.get('/:id/rubrics', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT mr.id AS binding_id, mr.model_id, mr.rubric_id, mr.is_default, mr.notes, mr.created_at,
           ar.name, ar.description, ar.rubric_type, ar.is_active, ar.passing_score,
           ar.material_type, ar.joint_type, ar.weld_process
    FROM model_rubrics mr
    JOIN assessment_rubrics ar ON ar.id = mr.rubric_id
    WHERE mr.model_id = ?
    ORDER BY mr.is_default DESC, ar.name
  `).bind(c.req.param('id')).all();
  return c.json(rows.results);
});

// ── POST /api/models/:id/rubrics ──────────────────────────────────────────────
// Bind a rubric to this model.
// Body: { rubric_id: number, is_default?: boolean, notes?: string }
// Setting is_default=true clears any existing default for this model first.

mlops.post('/:id/rubrics', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const modelId = Number(c.req.param('id'));
  const { rubric_id, is_default = false, notes = '' } = await c.req.json<{
    rubric_id?: number;
    is_default?: boolean;
    notes?: string;
  }>();
  if (!rubric_id) return c.json({ error: 'rubric_id is required' }, 400);

  // Verify model exists
  const model = await c.env.DB
    .prepare('SELECT id FROM ai_models WHERE id = ?').bind(modelId).first();
  if (!model) return c.json({ error: 'Model not found' }, 404);

  // Verify rubric exists
  const rubric = await c.env.DB
    .prepare('SELECT id FROM assessment_rubrics WHERE id = ?').bind(rubric_id).first();
  if (!rubric) return c.json({ error: 'Rubric not found' }, 404);

  if (is_default) {
    // Clear existing default for this model
    await c.env.DB
      .prepare('UPDATE model_rubrics SET is_default = 0 WHERE model_id = ?')
      .bind(modelId).run();
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO model_rubrics (model_id, rubric_id, is_default, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(model_id, rubric_id) DO UPDATE SET
      is_default = excluded.is_default,
      notes = excluded.notes
  `).bind(modelId, rubric_id, is_default ? 1 : 0, notes).run();

  return c.json({ binding_id: result.meta.last_row_id, model_id: modelId, rubric_id, is_default }, 201);
});

// ── PATCH /api/models/:id/rubrics/:rubric_id ──────────────────────────────────
// Update an existing binding (e.g. toggle is_default).

mlops.patch('/:id/rubrics/:rubric_id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const modelId = Number(c.req.param('id'));
  const rubricId = Number(c.req.param('rubric_id'));
  const { is_default, notes } = await c.req.json<{ is_default?: boolean; notes?: string }>();

  if (is_default === true) {
    await c.env.DB
      .prepare('UPDATE model_rubrics SET is_default = 0 WHERE model_id = ?')
      .bind(modelId).run();
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (is_default !== undefined) { updates.push('is_default = ?'); values.push(is_default ? 1 : 0); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400);

  values.push(modelId, rubricId);
  await c.env.DB
    .prepare(`UPDATE model_rubrics SET ${updates.join(', ')} WHERE model_id = ? AND rubric_id = ?`)
    .bind(...values).run();

  return c.json({ message: 'Binding updated' });
});

// ── DELETE /api/models/:id/rubrics/:rubric_id ─────────────────────────────────
// Remove a rubric binding from a model.

mlops.delete('/:id/rubrics/:rubric_id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  await c.env.DB
    .prepare('DELETE FROM model_rubrics WHERE model_id = ? AND rubric_id = ?')
    .bind(c.req.param('id'), c.req.param('rubric_id')).run();

  return c.json({ message: 'Binding removed' });
});

export default mlops;
