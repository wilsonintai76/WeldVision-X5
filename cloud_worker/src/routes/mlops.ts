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

mlops.post('/', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden: admin only' }, 403);

  const {
    name, version, description = '', model_file_key,
    status = 'uploaded', accuracy, precision_score, recall, f1_score,
    framework_version = '',
  } = await c.req.json<{
    name?: string; version?: string; description?: string; model_file_key?: string;
    status?: string; accuracy?: number; precision_score?: number;
    recall?: number; f1_score?: number; framework_version?: string;
  }>();

  if (!name || !version) return c.json({ error: 'name and version are required' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO ai_models
      (name, version, description, model_file_key, status,
       accuracy, precision_score, recall, f1_score, framework_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    name, version, description, model_file_key ?? null, status,
    accuracy ?? null, precision_score ?? null, recall ?? null, f1_score ?? null, framework_version,
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

  const allowed = ['name', 'description', 'status', 'accuracy', 'precision_score', 'recall', 'f1_score', 'framework_version', 'model_file_key'];
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
// Triggers the compile_model.yml GitHub Actions workflow using a .pt model
// already stored in R2. The workflow downloads it, converts to ONNX, then
// compiles to Horizon BPU .bin and uploads the result back to R2.
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
  if (!model.model_file_key.endsWith('.pt')) {
    return c.json({ error: 'Only .pt (PyTorch) files can be compiled to Horizon .bin' }, 400);
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
        inputs: { model_r2_key: model.model_file_key },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    return c.json({ error: `GitHub API error (${resp.status}): ${err}` }, 502);
  }

  return c.json({
    dispatched: true,
    model: `${model.name} v${model.version}`,
    r2_key: model.model_file_key,
  });
});

export default mlops;
