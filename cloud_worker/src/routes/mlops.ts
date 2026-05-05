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

export default mlops;
