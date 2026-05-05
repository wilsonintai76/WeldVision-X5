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

export default app;
