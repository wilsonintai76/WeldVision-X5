/**
 * Hono RPC procedures  —  /api/rpc/*
 *
 * Each route uses zValidator so request body AND response are fully inferred
 * by the Hono client (hc). The exported AppType in index.ts propagates these
 * types to the frontend with zero code-gen.
 *
 * Frontend usage:
 *   import { rpc } from '@/lib/rpcClient'
 *   const res  = await rpc.student_summary.$post({ json: { student_id: 1 } })
 *   const body = await res.json()   // ← fully typed, no casting needed
 *
 * Available procedures:
 *   POST /api/rpc/student_summary    – per-student stats + top defects
 *   POST /api/rpc/class_leaderboard  – ranked list for a class group
 *   POST /api/rpc/course_progress    – enrolment / assessed / passing breakdown
 *   POST /api/rpc/score_evaluation   – recalculate weighted rubric score
 *   POST /api/rpc/defect_heatmap     – defect occurrence counts for charts
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Env, JWTPayload } from '../types';

// ── Zod input schemas ────────────────────────────────────────────────────────

const StudentIdSchema = z.object({
  student_id: z.number().int().positive(),
});

const ClassLeaderboardSchema = z.object({
  class_group_id: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).optional(),
});

const CourseIdSchema = z.object({
  course_id: z.number().int().positive(),
});

const ScoreEvaluationSchema = z.object({
  evaluation_id: z.number().int().positive(),
});

const DefectHeatmapSchema = z.object({
  student_id:      z.number().int().positive().optional(),
  class_group_id:  z.number().int().positive().optional(),
  course_id:       z.number().int().positive().optional(),
}).refine(d => d.student_id ?? d.class_group_id ?? d.course_id, {
  message: 'Provide student_id, class_group_id, or course_id',
});

// ── Router ───────────────────────────────────────────────────────────────────

const rpc = new Hono<{ Bindings: Env }>();

// POST /api/rpc/student_summary ───────────────────────────────────────────────

const studentSummaryRoute = rpc.post(
  '/student_summary',
  zValidator('json', StudentIdSchema),
  async (c) => {
    const { student_id } = c.req.valid('json');

    const [statsRow, topDefects, metricAverages] = await Promise.all([
      c.env.DB.prepare(`
        SELECT
          COUNT(*)                                              AS total_assessments,
          ROUND(AVG(final_score), 2)                           AS avg_score,
          MIN(final_score)                                     AS min_score,
          MAX(final_score)                                     AS max_score,
          SUM(CASE WHEN final_score >= 60 THEN 1 ELSE 0 END)  AS passed,
          MAX(created_at)                                      AS last_assessment_at
        FROM assessments
        WHERE student_id = ?
      `).bind(student_id).first<{
        total_assessments: number; avg_score: number | null;
        min_score: number | null;  max_score: number | null;
        passed: number;            last_assessment_at: string | null;
      }>(),

      c.env.DB.prepare(`
        SELECT
          ad.defect_name,
          COALESCE(dc.display_name, ad.defect_name)  AS display_name,
          COALESCE(dc.color, '#6B7280')               AS color,
          SUM(ad.count)                               AS total_count,
          ROUND(AVG(ad.confidence), 3)                AS avg_confidence
        FROM assessment_detections ad
        JOIN assessments a ON a.id = ad.assessment_id
        LEFT JOIN defect_classes dc ON dc.id = ad.defect_class_id
        WHERE a.student_id = ?
        GROUP BY ad.defect_name
        ORDER BY total_count DESC
        LIMIT 5
      `).bind(student_id).all<{
        defect_name: string; display_name: string; color: string;
        total_count: number; avg_confidence: number | null;
      }>(),

      c.env.DB.prepare(`
        SELECT am.metric_key, ROUND(AVG(am.metric_value), 3) AS avg_value, am.metric_unit
        FROM assessment_metrics am
        JOIN assessments a ON a.id = am.assessment_id
        WHERE a.student_id = ? AND am.metric_value IS NOT NULL
          AND am.metric_key NOT LIKE 'ai.%'
        GROUP BY am.metric_key
        ORDER BY am.metric_key
      `).bind(student_id).all<{
        metric_key: string; avg_value: number | null; metric_unit: string;
      }>(),
    ]);

    return c.json({
      student_id,
      stats:           statsRow,
      top_defects:     topDefects.results,
      metric_averages: metricAverages.results,
    });
  }
);

// POST /api/rpc/class_leaderboard ─────────────────────────────────────────────

const classLeaderboardRoute = rpc.post(
  '/class_leaderboard',
  zValidator('json', ClassLeaderboardSchema),
  async (c) => {
    const { class_group_id, limit = 20 } = c.req.valid('json');

    const rows = await c.env.DB.prepare(`
      SELECT
        s.id                                                    AS student_db_id,
        s.student_id                                            AS student_code,
        s.name,
        COUNT(a.id)                                             AS total_assessments,
        ROUND(AVG(a.final_score), 2)                           AS avg_score,
        SUM(CASE WHEN a.final_score >= 60 THEN 1 ELSE 0 END)  AS passed,
        MAX(a.created_at)                                       AS last_assessment_at
      FROM students s
      LEFT JOIN assessments a ON a.student_id = s.id
      WHERE s.class_group_id = ?
      GROUP BY s.id
      ORDER BY avg_score DESC, total_assessments DESC
      LIMIT ?
    `).bind(class_group_id, limit).all<{
      student_db_id: number; student_code: string; name: string;
      total_assessments: number; avg_score: number | null;
      passed: number; last_assessment_at: string | null;
    }>();

    return c.json({ class_group_id, leaderboard: rows.results });
  }
);

// POST /api/rpc/course_progress ───────────────────────────────────────────────

const courseProgressRoute = rpc.post(
  '/course_progress',
  zValidator('json', CourseIdSchema),
  async (c) => {
    const { course_id } = c.req.valid('json');

    const [enrolled, assessed, passing, defectBreakdown, scoreDistribution] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) AS total FROM student_courses WHERE course_id = ?'
      ).bind(course_id).first<{ total: number }>(),

      c.env.DB.prepare(
        'SELECT COUNT(DISTINCT student_id) AS total FROM assessments WHERE course_id = ?'
      ).bind(course_id).first<{ total: number }>(),

      c.env.DB.prepare(
        'SELECT COUNT(DISTINCT student_id) AS total FROM assessments WHERE course_id = ? AND final_score >= 60'
      ).bind(course_id).first<{ total: number }>(),

      c.env.DB.prepare(`
        SELECT
          ad.defect_name,
          COALESCE(dc.display_name, ad.defect_name) AS display_name,
          COALESCE(dc.color, '#6B7280')              AS color,
          SUM(ad.count)                              AS total_count
        FROM assessment_detections ad
        JOIN assessments a ON a.id = ad.assessment_id
        LEFT JOIN defect_classes dc ON dc.id = ad.defect_class_id
        WHERE a.course_id = ?
        GROUP BY ad.defect_name
        ORDER BY total_count DESC
      `).bind(course_id).all<{
        defect_name: string; display_name: string; color: string; total_count: number;
      }>(),

      c.env.DB.prepare(`
        SELECT
          CASE
            WHEN final_score < 40 THEN 'fail_low'
            WHEN final_score < 60 THEN 'fail_high'
            WHEN final_score < 80 THEN 'pass_good'
            ELSE                       'pass_excellent'
          END AS bucket,
          COUNT(*) AS count
        FROM assessments
        WHERE course_id = ? AND final_score IS NOT NULL
        GROUP BY bucket
      `).bind(course_id).all<{ bucket: string; count: number }>(),
    ]);

    const enrolledTotal = enrolled?.total ?? 0;
    const passingTotal  = passing?.total ?? 0;

    return c.json({
      course_id,
      enrolled:           enrolledTotal,
      assessed:           assessed?.total ?? 0,
      passing:            passingTotal,
      pass_rate:          enrolledTotal ? Math.round((passingTotal / enrolledTotal) * 100) : 0,
      defect_breakdown:   defectBreakdown.results,
      score_distribution: scoreDistribution.results,
    });
  }
);

// POST /api/rpc/score_evaluation ──────────────────────────────────────────────
// Recalculates weighted total_score from criterion_scores and persists it.

const scoreEvaluationRoute = rpc.post(
  '/score_evaluation',
  zValidator('json', ScoreEvaluationSchema),
  async (c) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    if (payload.role === 'student') {
      return c.json({ error: 'Forbidden' } as const, 403);
    }

    const { evaluation_id } = c.req.valid('json');

    const result = await c.env.DB.prepare(`
      SELECT
        ROUND(SUM(CAST(cs.score AS REAL) * rc.weight) / SUM(rc.weight), 3) AS weighted_score,
        COUNT(cs.id)                                                         AS criteria_scored
      FROM criterion_scores cs
      JOIN rubric_criteria rc ON rc.id = cs.criterion_id
      WHERE cs.evaluation_id = ?
    `).bind(evaluation_id).first<{ weighted_score: number | null; criteria_scored: number }>();

    if (!result || result.criteria_scored === 0) {
      return c.json({ error: 'No criterion scores found for this evaluation' } as const, 404);
    }

    const evalRow = await c.env.DB.prepare(
      'SELECT rubric_id FROM student_evaluations WHERE id = ?'
    ).bind(evaluation_id).first<{ rubric_id: number | null }>();

    const rubric = evalRow?.rubric_id
      ? await c.env.DB.prepare(
          'SELECT passing_score FROM assessment_rubrics WHERE id = ?'
        ).bind(evalRow.rubric_id).first<{ passing_score: number }>()
      : null;

    const passingScore  = rubric?.passing_score ?? 3.0;
    const weightedScore = result.weighted_score ?? 0;
    const passed        = weightedScore >= passingScore;

    await c.env.DB.prepare(
      'UPDATE student_evaluations SET total_score = ?, passed = ? WHERE id = ?'
    ).bind(weightedScore, passed ? 1 : 0, evaluation_id).run();

    return c.json({ evaluation_id, weighted_score: weightedScore, passing_score: passingScore, passed, criteria_scored: result.criteria_scored });
  }
);

// POST /api/rpc/defect_heatmap ────────────────────────────────────────────────

const defectHeatmapRoute = rpc.post(
  '/defect_heatmap',
  zValidator('json', DefectHeatmapSchema),
  async (c) => {
    const body = c.req.valid('json');

    type HeatmapRow = {
      defect_name: string; display_name: string; color: string;
      total_count: number; affected_assessments: number;
      avg_confidence: number | null; avg_depth_mm: number | null;
    };

    const selectBase = `
      SELECT
        ad.defect_name,
        COALESCE(dc.display_name, ad.defect_name) AS display_name,
        COALESCE(dc.color, '#6B7280')              AS color,
        SUM(ad.count)                              AS total_count,
        COUNT(DISTINCT ad.assessment_id)           AS affected_assessments,
        ROUND(AVG(ad.confidence), 3)               AS avg_confidence,
        ROUND(AVG(ad.depth_mm), 2)                 AS avg_depth_mm
      FROM assessment_detections ad
      JOIN assessments a ON a.id = ad.assessment_id
      LEFT JOIN defect_classes dc ON dc.id = ad.defect_class_id
    `;

    let rows: D1Result<HeatmapRow>;

    if (body.student_id) {
      rows = await c.env.DB.prepare(
        `${selectBase} WHERE a.student_id = ? GROUP BY ad.defect_name ORDER BY total_count DESC`
      ).bind(body.student_id).all<HeatmapRow>();
    } else if (body.course_id) {
      rows = await c.env.DB.prepare(
        `${selectBase} WHERE a.course_id = ? GROUP BY ad.defect_name ORDER BY total_count DESC`
      ).bind(body.course_id).all<HeatmapRow>();
    } else {
      rows = await c.env.DB.prepare(`
        ${selectBase}
        JOIN students s ON s.id = a.student_id
        WHERE s.class_group_id = ?
        GROUP BY ad.defect_name
        ORDER BY total_count DESC
      `).bind(body.class_group_id).all<HeatmapRow>();
    }

    return c.json({ heatmap: rows.results });
  }
);

// ── Export route types for hc<AppType> ───────────────────────────────────────
// AppType in index.ts merges these so the frontend client is fully typed.

export type RpcRoutes =
  typeof studentSummaryRoute &
  typeof classLeaderboardRoute &
  typeof courseProgressRoute &
  typeof scoreEvaluationRoute &
  typeof defectHeatmapRoute;

export default rpc;
