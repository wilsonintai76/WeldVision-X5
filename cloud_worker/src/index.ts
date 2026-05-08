import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verify } from 'hono/jwt';
import { Env, JWTPayload } from './types';
import authRouter from './routes/auth';
import coreRouter from './routes/core';
import resultsRouter from './routes/results';
import rubricsRouter from './routes/rubrics';
import mlopsRouter from './routes/mlops';
import storageRouter, { serveMedia } from './routes/storage';
import rpcRouter from './routes/rpc';

const app = new Hono<{ Bindings: Env }>();

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  return cors({
    origin: origins.length > 1 ? origins : (origins[0] ?? '*'),
    allowHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'ETag'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// ── Public paths (no JWT required) ───────────────────────────────────────────

const PUBLIC_PATHS = new Set([
  '/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-pin',
  '/api/webhooks/edge-impulse',
]);

// ── JWT auth middleware ───────────────────────────────────────────────────────

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Strip trailing slash for comparison
  if (PUBLIC_PATHS.has(path) || PUBLIC_PATHS.has(path.replace(/\/$/, ''))) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: missing Bearer token' }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as unknown as JWTPayload;
    c.set('jwtPayload', payload);
    return next();
  } catch {
    return c.json({ error: 'Unauthorized: invalid or expired token' }, 401);
  }
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'WeldVision Cloud API', version: '2.0.0' })
);

// ── Media proxy (R2 objects) — mounted before routers ────────────────────────
// GET /api/media/:key*  → stream from R2

app.get('/api/media/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/media\//, '');
  if (!key) return c.json({ error: 'No key specified' }, 400);
  return serveMedia(key, c.env);
});

// ── Route mounts ──────────────────────────────────────────────────────────────

// Auth  →  /api/auth/*
//   Public:    POST /api/auth/login, POST /api/auth/register
//   Protected: GET  /api/auth/check, GET /api/auth/profile, etc.
app.route('/api/auth', authRouter);

// User management (also under auth router)
//   GET/PATCH/DELETE /api/users/:id, POST /api/users/:id/approve
app.route('/api/users', authRouter);

// Core resources
app.route('/api', coreRouter);  // handles /api/classes, /api/sessions, /api/students, etc.

// Assessment results
//   GET/POST      /api/assessments
//   GET/DELETE    /api/assessments/:id
//   POST          /api/upload-assessment  (legacy multipart from edge device)
app.route('/api/assessments', resultsRouter);
app.post('/api/upload-assessment', (c) => resultsRouter.fetch(
  new Request(c.req.url.replace('/api/upload-assessment', '/api/assessments/upload-assessment'), c.req.raw),
  c.env, c.executionCtx
));

// Rubrics  →  /api/rubrics/*  and  /api/evaluations/*
app.route('/api/rubrics', rubricsRouter);
app.route('/api/evaluations', rubricsRouter);  // shortcut for /api/evaluations/*

// MLOps / model registry  →  /api/models/*
app.route('/api/models', mlopsRouter);

// ── Edge Impulse webhook  →  POST /api/webhooks/edge-impulse?token=<secret> ──
// Edge Impulse POSTs here after pipeline steps complete.
// If the payload contains a model export (.pt), auto-trigger GitHub compile.
app.post('/api/webhooks/edge-impulse', async (c) => {
  // Validate shared secret from query string
  const token = c.req.query('token');
  if (!token || token !== c.env.EDGE_IMPULSE_WEBHOOK_SECRET) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  console.log('[EdgeImpulse webhook]', JSON.stringify(body));

  // Edge Impulse webhook payload varies by step; look for an exported model key
  // Expecting: { project: { id }, files: [{ name, download_url }] } or similar
  // If there's a .pt file key in R2, dispatch compile. Otherwise just ack.
  const modelKey: string | undefined = (
    (body as { model_r2_key?: string }).model_r2_key ||
    undefined
  );

  if (modelKey && modelKey.endsWith('.pt')) {
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
        body: JSON.stringify({ ref: 'main', inputs: { model_r2_key: modelKey } }),
      }
    );
    if (resp.ok || resp.status === 204) {
      console.log(`[EdgeImpulse webhook] Dispatched compile for ${modelKey}`);
      return c.json({ received: true, dispatched: true, model_r2_key: modelKey });
    }
    const err = await resp.text();
    console.error(`[EdgeImpulse webhook] GitHub dispatch failed (${resp.status}): ${err}`);
    return c.json({ received: true, dispatched: false, error: err }, 502);
  }

  return c.json({ received: true, dispatched: false, note: 'No .pt model_r2_key in payload' });
});

// Storage (file uploads)  →  /api/storage/*
app.route('/api/storage', storageRouter);

// RPC-style computed procedures  →  /api/rpc/*
app.route('/api/rpc', rpcRouter);

// ── Error handlers ────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('[Worker] Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// AppType is used by the Hono client (hc) in the frontend.
// Import it with: import type { AppType } from '../../../cloud_worker/src'
export type AppType = typeof app;

// ── R2 event notification queue consumer ─────────────────────────────────────
// Cloudflare R2 sends a message to `model-compile-queue` whenever an object
// is created in weldvision-media under models/uploads/*.pt
// This consumer automatically dispatches the GitHub Actions compile workflow.

interface R2EventBody {
  object?: { key?: string };
}

export default {
  fetch: app.fetch.bind(app),

  async queue(batch: MessageBatch<R2EventBody>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const key = msg.body?.object?.key ?? '';

      if (!key.endsWith('.pt')) {
        msg.ack();
        continue;
      }

      console.log(`[Queue] Auto-compiling R2 model: ${key}`);

      const resp = await fetch(
        'https://api.github.com/repos/wilsonintai76/WeldVision-X5/actions/workflows/compile_model.yml/dispatches',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GITHUB_PAT}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WeldVision-Worker/1.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'main', inputs: { model_r2_key: key } }),
        }
      );

      if (resp.ok || resp.status === 204) {
        console.log(`[Queue] Dispatched compile job for ${key}`);
        msg.ack();
      } else {
        const text = await resp.text();
        console.error(`[Queue] GitHub dispatch failed (${resp.status}): ${text}`);
        msg.retry();
      }
    }
  },
};
