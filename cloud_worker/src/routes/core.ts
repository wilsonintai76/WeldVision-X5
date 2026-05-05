import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';

const core = new Hono<{ Bindings: Env }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdminOrInstructor(role: string) {
  return role === 'admin' || role === 'instructor';
}

// ── CLASS GROUPS (/api/classes) ───────────────────────────────────────────────

core.get('/classes', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM class_groups ORDER BY name')
    .all();
  return c.json(rows.results);
});

core.get('/classes/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM class_groups WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

core.post('/classes', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, description = '' } = await c.req.json<{ name?: string; description?: string }>();
  if (!name) return c.json({ error: 'name is required' }, 400);

  const result = await c.env.DB
    .prepare('INSERT INTO class_groups (name, description) VALUES (?, ?)')
    .bind(name, description)
    .run();
  return c.json({ id: result.meta.last_row_id, name, description }, 201);
});

core.put('/classes/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, description = '' } = await c.req.json<{ name?: string; description?: string }>();
  if (!name) return c.json({ error: 'name is required' }, 400);

  await c.env.DB
    .prepare('UPDATE class_groups SET name = ?, description = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(name, description, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

core.delete('/classes/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  await c.env.DB
    .prepare('DELETE FROM class_groups WHERE id = ?')
    .bind(c.req.param('id'))
    .run();
  return c.json({ message: 'Deleted' });
});

// ── SESSIONS (/api/sessions) ──────────────────────────────────────────────────

core.get('/sessions', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM sessions ORDER BY is_active DESC, name DESC')
    .all();
  return c.json(rows.results);
});

core.get('/sessions/active', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM sessions WHERE is_active = 1 LIMIT 1')
    .first();
  if (!row) return c.json({ error: 'No active session' }, 404);
  return c.json(row);
});

core.get('/sessions/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

core.post('/sessions', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const { name, start_date, end_date, is_active = false } = await c.req.json<{
    name?: string; start_date?: string; end_date?: string; is_active?: boolean;
  }>();
  if (!name) return c.json({ error: 'name is required' }, 400);

  if (is_active) {
    await c.env.DB.prepare('UPDATE sessions SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  const result = await c.env.DB
    .prepare('INSERT INTO sessions (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)')
    .bind(name, start_date ?? null, end_date ?? null, is_active ? 1 : 0)
    .run();
  return c.json({ id: result.meta.last_row_id, name, is_active }, 201);
});

core.put('/sessions/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const { name, start_date, end_date, is_active } = await c.req.json<{
    name?: string; start_date?: string; end_date?: string; is_active?: boolean;
  }>();
  if (is_active) {
    await c.env.DB.prepare('UPDATE sessions SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  await c.env.DB
    .prepare('UPDATE sessions SET name = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(name, start_date ?? null, end_date ?? null, is_active ? 1 : 0, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

core.delete('/sessions/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── COURSES (/api/courses) ────────────────────────────────────────────────────

core.get('/courses', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT c.*, s.name AS session_name, u.username AS instructor_username
    FROM courses c
    LEFT JOIN sessions s ON c.session_id = s.id
    LEFT JOIN users u ON c.instructor_id = u.id
    ORDER BY c.code, c.section
  `).all();
  return c.json(rows.results);
});

core.get('/courses/:id', async (c) => {
  const row = await c.env.DB.prepare(`
    SELECT c.*, s.name AS session_name, u.username AS instructor_username
    FROM courses c
    LEFT JOIN sessions s ON c.session_id = s.id
    LEFT JOIN users u ON c.instructor_id = u.id
    WHERE c.id = ?
  `).bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

core.post('/courses', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { code, name, section = '', session_id, instructor_id, description = '' } = await c.req.json<{
    code?: string; name?: string; section?: string;
    session_id?: number; instructor_id?: number; description?: string;
  }>();
  if (!code || !name || !session_id) {
    return c.json({ error: 'code, name, and session_id are required' }, 400);
  }
  const result = await c.env.DB
    .prepare('INSERT INTO courses (code, name, section, session_id, instructor_id, description) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(code, name, section, session_id, instructor_id ?? null, description)
    .run();
  return c.json({ id: result.meta.last_row_id, code, name, section, session_id }, 201);
});

core.put('/courses/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { code, name, section = '', session_id, instructor_id, description = '' } = await c.req.json<{
    code?: string; name?: string; section?: string;
    session_id?: number; instructor_id?: number; description?: string;
  }>();
  await c.env.DB
    .prepare('UPDATE courses SET code=?, name=?, section=?, session_id=?, instructor_id=?, description=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(code, name, section, session_id, instructor_id ?? null, description, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

core.delete('/courses/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── STUDENTS (/api/students) ──────────────────────────────────────────────────

core.get('/students', async (c) => {
  const { class_group_id, course_id, search } = c.req.query();

  let sql = `
    SELECT s.*, cg.name AS class_group_name
    FROM students s
    LEFT JOIN class_groups cg ON s.class_group_id = cg.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (course_id) {
    sql += ' JOIN student_courses sc ON s.id = sc.student_id';
    conditions.push('sc.course_id = ?');
    params.push(course_id);
  }
  if (class_group_id) { conditions.push('s.class_group_id = ?'); params.push(class_group_id); }
  if (search) {
    conditions.push('(s.name LIKE ? OR s.student_id LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY s.student_id';

  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(rows.results);
});

core.get('/students/:id', async (c) => {
  const row = await c.env.DB.prepare(`
    SELECT s.*, cg.name AS class_group_name
    FROM students s
    LEFT JOIN class_groups cg ON s.class_group_id = cg.id
    WHERE s.id = ?
  `).bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

core.post('/students', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { student_id, name, class_group_id, email } = await c.req.json<{
    student_id?: string; name?: string; class_group_id?: number; email?: string;
  }>();
  if (!student_id || !name) return c.json({ error: 'student_id and name are required' }, 400);

  const result = await c.env.DB
    .prepare('INSERT INTO students (student_id, name, class_group_id, email) VALUES (?, ?, ?, ?)')
    .bind(student_id, name, class_group_id ?? null, email ?? null)
    .run();
  return c.json({ id: result.meta.last_row_id, student_id, name }, 201);
});

core.put('/students/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { student_id, name, class_group_id, email } = await c.req.json<{
    student_id?: string; name?: string; class_group_id?: number; email?: string;
  }>();
  await c.env.DB
    .prepare('UPDATE students SET student_id=?, name=?, class_group_id=?, email=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(student_id, name, class_group_id ?? null, email ?? null, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

core.delete('/students/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// POST /api/students/:id/enroll  — enroll student in a course
core.post('/students/:id/enroll', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { course_id } = await c.req.json<{ course_id?: number }>();
  if (!course_id) return c.json({ error: 'course_id is required' }, 400);

  await c.env.DB
    .prepare('INSERT OR IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)')
    .bind(c.req.param('id'), course_id)
    .run();
  return c.json({ message: 'Enrolled' });
});

// GET /api/students/:student_code/assessments  (legacy edge device URL)
core.get('/students/:student_code/assessments', async (c) => {
  const student = await c.env.DB
    .prepare('SELECT id FROM students WHERE student_id = ?')
    .bind(c.req.param('student_code'))
    .first<{ id: number }>();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const rows = await c.env.DB
    .prepare('SELECT * FROM assessments WHERE student_id = ? ORDER BY timestamp DESC LIMIT 50')
    .bind(student.id)
    .all();
  return c.json(rows.results);
});

// ── STEREO CALIBRATIONS (/api/stereo-calibrations) ───────────────────────────

core.get('/stereo-calibrations', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM stereo_calibrations ORDER BY is_active DESC, updated_at DESC')
    .all();
  return c.json(rows.results);
});

core.get('/stereo-calibrations/active', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM stereo_calibrations WHERE is_active = 1 LIMIT 1')
    .first();
  if (!row) return c.json({ error: 'No active calibration' }, 404);
  return c.json(row);
});

core.get('/stereo-calibrations/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM stereo_calibrations WHERE id = ?')
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

core.post('/stereo-calibrations', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const {
    name, image_width = 1280, image_height = 720,
    board_width = 9, board_height = 6, square_size_mm = 25.0,
    calibration_data, is_active = false,
  } = await c.req.json<{
    name?: string; image_width?: number; image_height?: number;
    board_width?: number; board_height?: number; square_size_mm?: number;
    calibration_data?: unknown; is_active?: boolean;
  }>();
  if (!name) return c.json({ error: 'name is required' }, 400);

  if (is_active) {
    await c.env.DB.prepare('UPDATE stereo_calibrations SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  const result = await c.env.DB.prepare(`
    INSERT INTO stereo_calibrations (name, image_width, image_height, board_width, board_height, square_size_mm, calibration_data, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(name, image_width, image_height, board_width, board_height, square_size_mm,
    calibration_data ? JSON.stringify(calibration_data) : null, is_active ? 1 : 0).run();
  return c.json({ id: result.meta.last_row_id, name }, 201);
});

core.put('/stereo-calibrations/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const {
    name, image_width, image_height, board_width, board_height,
    square_size_mm, calibration_data, is_active,
  } = await c.req.json<Record<string, unknown>>();

  if (is_active) {
    await c.env.DB.prepare('UPDATE stereo_calibrations SET is_active = 0, updated_at = datetime(\'now\')').run();
  }
  await c.env.DB.prepare(`
    UPDATE stereo_calibrations
    SET name=?, image_width=?, image_height=?, board_width=?, board_height=?,
        square_size_mm=?, calibration_data=?, is_active=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(name, image_width, image_height, board_width, board_height, square_size_mm,
    calibration_data ? JSON.stringify(calibration_data) : null,
    is_active ? 1 : 0, c.req.param('id')).run();
  return c.json({ message: 'Updated' });
});

core.delete('/stereo-calibrations/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM stereo_calibrations WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── DEFECT CLASSES (/api/defect-classes) ─────────────────────────────────────

core.get('/defect-classes', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM defect_classes ORDER BY name').all();
  return c.json(rows.results);
});

core.post('/defect-classes', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, display_name, color = '#3B82F6', description = '' } = await c.req.json<{
    name?: string; display_name?: string; color?: string; description?: string;
  }>();
  if (!name || !display_name) return c.json({ error: 'name and display_name are required' }, 400);

  const result = await c.env.DB
    .prepare('INSERT INTO defect_classes (name, display_name, color, description) VALUES (?, ?, ?, ?)')
    .bind(name, display_name, color, description)
    .run();
  return c.json({ id: result.meta.last_row_id, name, display_name, color }, 201);
});

core.put('/defect-classes/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (!isAdminOrInstructor(payload.role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, display_name, color, description } = await c.req.json<Record<string, string>>();
  await c.env.DB
    .prepare('UPDATE defect_classes SET name=?, display_name=?, color=?, description=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(name, display_name, color, description, c.req.param('id'))
    .run();
  return c.json({ message: 'Updated' });
});

core.delete('/defect-classes/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await c.env.DB.prepare('DELETE FROM defect_classes WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

export default core;
