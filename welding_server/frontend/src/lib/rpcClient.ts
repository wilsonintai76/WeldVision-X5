/**
 * Hono RPC client for WeldVision Cloud Worker
 *
 * Uses typed wrappers around fetch so both request body and response are fully
 * typed without importing across CloudFlare Workers / browser project boundaries
 * (which would leak CF Worker types into the browser TypeScript environment).
 *
 * Usage:
 *   import { rpc } from '@/lib/rpcClient'
 *
 *   const summary = await rpc.studentSummary({ student_id: 42 })
 *   // summary.top_defects is typed as DefectRow[]
 *
 *   const board = await rpc.classLeaderboard({ class_group_id: 1, limit: 10 })
 *   const prog  = await rpc.courseProgress({ course_id: 3 })
 *   const score = await rpc.scoreEvaluation({ evaluation_id: 7 })
 *   const heat  = await rpc.defectHeatmap({ student_id: 42 })
 */

/// <reference types="vite/client" />

// In production, VITE_API_URL is set to https://api.weldvision-x5.com
// In local dev, fall back to the wrangler dev server
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// -- Response types -----------------------------------------------------------
// Mirrors the typed c.json() shapes in cloud_worker/src/routes/rpc.ts

export type DefectRow = {
  defect_name: string; display_name: string; color: string;
  total_count: number; avg_confidence: number | null;
};

export type MetricAvgRow = {
  metric_key: string; avg_value: number | null; metric_unit: string;
};

export type StudentSummaryResponse = {
  student_id: number;
  stats: {
    total_assessments: number; avg_score: number | null;
    min_score: number | null;  max_score: number | null;
    passed: number;            last_assessment_at: string | null;
  } | null;
  top_defects:     DefectRow[];
  metric_averages: MetricAvgRow[];
};

export type LeaderboardEntry = {
  student_db_id: number; student_code: string; name: string;
  total_assessments: number; avg_score: number | null;
  passed: number; last_assessment_at: string | null;
};

export type CourseProgressResponse = {
  course_id: number;
  enrolled: number; assessed: number; passing: number; pass_rate: number;
  defect_breakdown:   { defect_name: string; display_name: string; color: string; total_count: number }[];
  score_distribution: { bucket: string; count: number }[];
};

export type ScoreEvaluationResponse = {
  evaluation_id: number;
  weighted_score: number; passing_score: number;
  passed: boolean; criteria_scored: number;
};

export type HeatmapRow = {
  defect_name: string; display_name: string; color: string;
  total_count: number; affected_assessments: number;
  avg_confidence: number | null; avg_depth_mm: number | null;
};

// -- Fetch helper -------------------------------------------------------------

async function call<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}/api/rpc/${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status });
  }
  return res.json() as Promise<TResponse>;
}

// -- Typed RPC procedures -----------------------------------------------------

export const rpc = {
  studentSummary: (body: { student_id: number }) =>
    call<typeof body, StudentSummaryResponse>('student_summary', body),

  classLeaderboard: (body: { class_group_id: number; limit?: number }) =>
    call<typeof body, { class_group_id: number; leaderboard: LeaderboardEntry[] }>('class_leaderboard', body),

  courseProgress: (body: { course_id: number }) =>
    call<typeof body, CourseProgressResponse>('course_progress', body),

  scoreEvaluation: (body: { evaluation_id: number }) =>
    call<typeof body, ScoreEvaluationResponse>('score_evaluation', body),

  defectHeatmap: (body: { student_id?: number; class_group_id?: number; course_id?: number }) =>
    call<typeof body, { heatmap: HeatmapRow[] }>('defect_heatmap', body),
} as const;
