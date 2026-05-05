import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';

const storage = new Hono<{ Bindings: Env }>();

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bin', 'pt', 'onnx', 'ply']);
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// ── POST /api/storage/upload ─────────────────────────────────────────────────
// Upload a file to R2, returns the storage key and worker-proxied URL.

storage.post('/upload', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ error: 'file field is required' }, 400);

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ error: `File type .${ext} not allowed` }, 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: `File exceeds 100 MB limit` }, 400);
  }

  const folder = ((form.get('folder') as string) ?? 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${folder}/${timestamp}_${safeName}`;

  await c.env.STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  return c.json({ key, url: `/api/media/${key}` }, 201);
});

// ── GET /api/media/:key*  — R2 object proxy ───────────────────────────────────
// Streams the R2 object through the Worker with proper Content-Type.
// This is mounted at app level as /api/media/* so it works for all paths.

export async function serveMedia(key: string, env: Env): Promise<Response> {
  const obj = await env.STORAGE.get(key);
  if (!obj) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}

// ── DELETE /api/storage/:key* ─────────────────────────────────────────────────

storage.delete('/:key{.+}', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role === 'student') return c.json({ error: 'Forbidden' }, 403);

  const key = c.req.param('key');
  await c.env.STORAGE.delete(key);
  return c.json({ message: 'Deleted' });
});

export default storage;
