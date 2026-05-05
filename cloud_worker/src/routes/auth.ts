import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Env, JWTPayload, UserRow, StudentRow } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// ── Password hashing (PBKDF2 via Web Crypto API) ──────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMaterial, 256
  );
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:sha256:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, , iterStr, saltHex, storedHash] = parts;
  const iterations = parseInt(iterStr, 10);
  const salt = new Uint8Array((saltHex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial, 256
  );
  const computedHash = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

function makeUserToken(user: UserRow, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: String(user.id),
    username: user.staff_id ?? user.username,
    role: user.role as JWTPayload['role'],
    account_type: 'user',
    iat: now,
    exp: now + 60 * 60 * 24, // 24 h
  } as unknown as Record<string, unknown>, secret, 'HS256');
}

function makeStudentToken(student: StudentRow, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: String(student.id),
    username: student.student_id,
    role: 'student',
    account_type: 'student',
    iat: now,
    exp: now + 60 * 60 * 24, // 24 h
  } as unknown as Record<string, unknown>, secret, 'HS256');
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    username: user.staff_id ?? user.username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    is_approved: Boolean(user.is_approved),
    must_change_password: Boolean(user.must_change_password),
    student_profile_id: user.student_profile_id,
    staff_id: user.staff_id,
    account_type: 'user',
  };
}

function publicStudent(student: StudentRow) {
  const [first_name = '', ...rest] = student.name.split(' ');
  return {
    id: student.id,
    username: student.student_id,
    student_id: student.student_id,
    name: student.name,
    first_name,
    last_name: rest.join(' '),
    email: student.email ?? '',
    role: 'student',
    account_type: 'student',
    class_group_id: student.class_group_id,
    is_approved: true,
    must_change_password: false,
    student_profile_id: student.id,
  };
}

// ── Public routes (no auth middleware) ───────────────────────────────────────

// POST /api/auth/login
// Accepts: { identifier, pin }  — student (student_id) or staff (staff_id)
// Fallback: { identifier, password } or { username, password } — admin PBKDF2 (migration path)
auth.post('/login', async (c) => {
  const body = await c.req.json<{
    identifier?: string; pin?: string;
    username?: string;   password?: string; // backward-compat fields
  }>();

  const identifier = (body.identifier ?? body.username ?? '').trim();
  const secret     = (body.pin ?? body.password ?? '').trim();

  if (!identifier || !secret) {
    return c.json({ error: 'identifier and pin are required' }, 400);
  }

  // ── 1. Try students table by student_id ─────────────────────────────────
  const student = await c.env.DB
    .prepare('SELECT * FROM students WHERE student_id = ?')
    .bind(identifier)
    .first<StudentRow>();

  if (student) {
    if (!student.pin_hash) {
      return c.json({ error: 'PIN not set. Please contact your instructor.' }, 403);
    }
    if (!(await verifyPassword(secret, student.pin_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    const token = await makeStudentToken(student, c.env.JWT_SECRET);
    return c.json({ token, user: publicStudent(student) });
  }

  // ── 2. Try users table by staff_id ──────────────────────────────────────
  const userByStaff = await c.env.DB
    .prepare('SELECT * FROM users WHERE staff_id = ?')
    .bind(identifier)
    .first<UserRow>();

  if (userByStaff) {
    if (!userByStaff.pin_hash) {
      return c.json({ error: 'PIN not set. Please contact admin.' }, 403);
    }
    if (!(await verifyPassword(secret, userByStaff.pin_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    if (!userByStaff.is_approved) {
      return c.json({ error: 'Account pending admin approval' }, 403);
    }
    const token = await makeUserToken(userByStaff, c.env.JWT_SECRET);
    return c.json({ token, user: publicUser(userByStaff) });
  }

  // ── 3. Fallback: users table by username/email + PBKDF2 password ─────────
  //    (for admin accounts that haven't migrated to PIN yet)
  const userByUsername = await c.env.DB
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .bind(identifier, identifier)
    .first<UserRow>();

  if (!userByUsername || !(await verifyPassword(secret, userByUsername.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  if (!userByUsername.is_approved) {
    return c.json({ error: 'Account pending admin approval' }, 403);
  }

  const token = await makeUserToken(userByUsername, c.env.JWT_SECRET);
  return c.json({ token, user: publicUser(userByUsername) });
});

// POST /api/auth/forgot-pin  (public — resets student PIN back to their student_id)
auth.post('/forgot-pin', async (c) => {
  const { identifier } = await c.req.json<{ identifier?: string }>();
  if (!identifier) return c.json({ error: 'identifier required' }, 400);

  const student = await c.env.DB
    .prepare('SELECT * FROM students WHERE student_id = ?')
    .bind(identifier.trim())
    .first<StudentRow>();

  if (student) {
    // Reset to last 4 digits of student_id (padded with leading zeros if shorter)
    const defaultPin = student.student_id.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const pinHash = await hashPassword(defaultPin);
    await c.env.DB
      .prepare('UPDATE students SET pin_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(pinHash, student.id)
      .run();
  }
  // Always return success to prevent account enumeration
  return c.json({ message: 'If your ID is registered, your PIN has been reset to your registration number.' });
});

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json<{
    username?: string; password?: string; email?: string;
    first_name?: string; last_name?: string; role?: string;
  }>();
  const { username, password, email, first_name = '', last_name = '', role = 'student' } = body;

  if (!username || !password || !email) {
    return c.json({ error: 'username, password, email are required' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(username, email)
    .first();
  if (existing) {
    return c.json({ error: 'Username or email already in use' }, 409);
  }

  const safeRole = ['admin', 'instructor', 'student'].includes(role) ? role : 'student';
  const passwordHash = await hashPassword(password);

  const result = await c.env.DB
    .prepare(
      'INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)'
    )
    .bind(username, email, passwordHash, safeRole, first_name, last_name)
    .run();

  return c.json(
    {
      id: result.meta.last_row_id,
      username,
      email,
      role: safeRole,
      message: 'Registration successful. Awaiting admin approval.',
    },
    201
  );
});

// ── Protected routes (auth middleware applied at app level) ───────────────────

// GET /api/auth/check  (replaces Django /api/auth/check/)
auth.get('/check', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;

  if (payload.account_type === 'student') {
    const student = await c.env.DB
      .prepare('SELECT * FROM students WHERE id = ?')
      .bind(payload.sub)
      .first<StudentRow>();
    if (!student) return c.json({ authenticated: false }, 401);
    return c.json({ authenticated: true, user: publicStudent(student) });
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<UserRow>();
  if (!user) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true, user: publicUser(user) });
});

// GET /api/auth/profile
auth.get('/profile', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;

  if (payload.account_type === 'student') {
    const student = await c.env.DB
      .prepare('SELECT * FROM students WHERE id = ?')
      .bind(payload.sub)
      .first<StudentRow>();
    if (!student) return c.json({ error: 'Student not found' }, 404);
    return c.json(publicStudent(student));
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<UserRow>();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(publicUser(user));
});

// POST /api/auth/change-password  (users with PBKDF2 password only)
auth.post('/change-password', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.account_type === 'student') {
    return c.json({ error: 'Students use /auth/change-pin' }, 400);
  }
  const { old_password, new_password } = await c.req.json<{
    old_password?: string; new_password?: string;
  }>();
  if (!old_password || !new_password) {
    return c.json({ error: 'old_password and new_password required' }, 400);
  }
  if (new_password.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters' }, 400);
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<UserRow>();
  if (!user) return c.json({ error: 'User not found' }, 404);

  if (!(await verifyPassword(old_password, user.password_hash))) {
    return c.json({ error: 'Current password is incorrect' }, 400);
  }

  const newHash = await hashPassword(new_password);
  await c.env.DB
    .prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(newHash, payload.sub)
    .run();

  return c.json({ message: 'Password changed successfully' });
});

// POST /api/auth/change-pin  (students and staff who use PIN login)
auth.post('/change-pin', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const { old_pin, new_pin } = await c.req.json<{ old_pin?: string; new_pin?: string }>();

  if (!old_pin || !new_pin) {
    return c.json({ error: 'old_pin and new_pin required' }, 400);
  }
  if (!/^\d{4}$/.test(new_pin)) {
    return c.json({ error: 'PIN must be exactly 4 digits' }, 400);
  }

  if (payload.account_type === 'student') {
    const student = await c.env.DB
      .prepare('SELECT * FROM students WHERE id = ?')
      .bind(payload.sub)
      .first<StudentRow>();
    if (!student) return c.json({ error: 'Student not found' }, 404);
    if (!student.pin_hash || !(await verifyPassword(old_pin, student.pin_hash))) {
      return c.json({ error: 'Current PIN is incorrect' }, 400);
    }
    const newHash = await hashPassword(new_pin);
    await c.env.DB
      .prepare('UPDATE students SET pin_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(newHash, payload.sub)
      .run();
  } else {
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<UserRow>();
    if (!user) return c.json({ error: 'User not found' }, 404);
    if (!user.pin_hash || !(await verifyPassword(old_pin, user.pin_hash))) {
      return c.json({ error: 'Current PIN is incorrect' }, 400);
    }
    const newHash = await hashPassword(new_pin);
    await c.env.DB
      .prepare('UPDATE users SET pin_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(newHash, payload.sub)
      .run();
  }
  return c.json({ message: 'PIN changed successfully' });
});

// POST /api/auth/force-change-password  (used when must_change_password=1 for staff users)
auth.post('/force-change-password', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.account_type === 'student') {
    return c.json({ error: 'Students use /auth/force-change-pin' }, 400);
  }
  const { new_password, new_pin } = await c.req.json<{ new_password?: string; new_pin?: string }>();
  const value = new_pin ?? new_password;
  if (!value) {
    return c.json({ error: 'new_pin or new_password required' }, 400);
  }

  // If they're a PIN-based user, enforce 4-digit rule
  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<UserRow>();
  if (!user) return c.json({ error: 'User not found' }, 404);

  if (user.pin_hash !== null || new_pin) {
    // PIN-based user
    if (!/^\d{4}$/.test(value)) {
      return c.json({ error: 'PIN must be exactly 4 digits' }, 400);
    }
    const newHash = await hashPassword(value);
    await c.env.DB
      .prepare('UPDATE users SET pin_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(newHash, payload.sub)
      .run();
  } else {
    // Password-based user (admin fallback)
    if (value.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }
    const newHash = await hashPassword(value);
    await c.env.DB
      .prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(newHash, payload.sub)
      .run();
  }
  return c.json({ message: 'Credentials updated successfully' });
});

// GET /api/auth/available-classes  (for registration form dropdown)
auth.get('/available-classes', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT id, name FROM class_groups ORDER BY name')
    .all();
  return c.json(rows.results);
});

// ── Admin: PIN management ─────────────────────────────────────────────────────

// POST /api/auth/admin/reset-student-pin  — resets student PIN back to their student_id
auth.post('/admin/reset-student-pin', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin' && payload.role !== 'instructor') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const { student_id } = await c.req.json<{ student_id?: string }>();
  if (!student_id) return c.json({ error: 'student_id required' }, 400);

  const student = await c.env.DB
    .prepare('SELECT * FROM students WHERE student_id = ?')
    .bind(student_id)
    .first<StudentRow>();
  if (!student) return c.json({ error: 'Student not found' }, 404);

  // Reset PIN to their student_id (e.g. "1891" → last 4 digits "1891")
  const defaultPin = student_id.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const pinHash = await hashPassword(defaultPin);
  await c.env.DB
    .prepare('UPDATE students SET pin_hash = ?, updated_at = datetime(\'now\') WHERE student_id = ?')
    .bind(pinHash, student_id)
    .run();

  return c.json({ message: `PIN reset to ${defaultPin} for student ${student_id}` });
});

// POST /api/auth/admin/set-staff-pin  — sets or resets staff/admin PIN + staff_id
auth.post('/admin/set-staff-pin', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  if (payload.role !== 'admin') {
    return c.json({ error: 'Forbidden: admin only' }, 403);
  }
  const { user_id, staff_id, pin } = await c.req.json<{
    user_id?: number; staff_id?: string; pin?: string;
  }>();
  if (!user_id || !staff_id || !pin) {
    return c.json({ error: 'user_id, staff_id and pin required' }, 400);
  }
  if (!/^\d{4}$/.test(pin)) {
    return c.json({ error: 'PIN must be exactly 4 digits' }, 400);
  }

  const pinHash = await hashPassword(pin);
  await c.env.DB
    .prepare('UPDATE users SET staff_id = ?, pin_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(staff_id, pinHash, user_id)
    .run();

  return c.json({ message: `Staff ID and PIN set for user ${user_id}` });
});

// ── Admin: user management ────────────────────────────────────────────────────

function requireAdmin(payload: JWTPayload, c: any) {
  if (payload.role !== 'admin') {
    return c.json({ error: 'Forbidden: admin only' }, 403);
  }
  return null;
}

// GET /api/users
auth.get('/users', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  const rows = await c.env.DB
    .prepare(
      'SELECT id, username, email, role, first_name, last_name, is_approved, must_change_password, student_profile_id, created_at FROM users ORDER BY created_at DESC'
    )
    .all();
  return c.json(rows.results);
});

// GET /api/users/pending
auth.get('/users/pending', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  const rows = await c.env.DB
    .prepare(
      'SELECT id, username, email, role, first_name, last_name, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC'
    )
    .all();
  return c.json(rows.results);
});

// GET /api/users/:id
auth.get('/users/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  const user = await c.env.DB
    .prepare('SELECT id, username, email, role, first_name, last_name, is_approved, must_change_password, student_profile_id, created_at FROM users WHERE id = ?')
    .bind(c.req.param('id'))
    .first<UserRow>();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

// PATCH /api/users/:id  (update role, approval, etc.)
auth.patch('/users/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  const body = await c.req.json<{
    role?: string; is_approved?: boolean;
    must_change_password?: boolean; student_profile_id?: number | null;
  }>();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.role !== undefined) {
    if (!['admin', 'instructor', 'student'].includes(body.role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }
    updates.push('role = ?'); values.push(body.role);
  }
  if (body.is_approved !== undefined) { updates.push('is_approved = ?'); values.push(body.is_approved ? 1 : 0); }
  if (body.must_change_password !== undefined) { updates.push('must_change_password = ?'); values.push(body.must_change_password ? 1 : 0); }
  if (body.student_profile_id !== undefined) { updates.push('student_profile_id = ?'); values.push(body.student_profile_id); }

  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400);
  updates.push('updated_at = datetime(\'now\')');
  values.push(c.req.param('id'));

  await c.env.DB
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return c.json({ message: 'User updated' });
});

// POST /api/users/:id/approve
auth.post('/users/:id/approve', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  await c.env.DB
    .prepare('UPDATE users SET is_approved = 1, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(c.req.param('id'))
    .run();
  return c.json({ message: 'User approved' });
});

// DELETE /api/users/:id
auth.delete('/users/:id', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const forbidden = requireAdmin(payload, c);
  if (forbidden) return forbidden;

  if (String(payload.sub) === c.req.param('id')) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }
  await c.env.DB
    .prepare('DELETE FROM users WHERE id = ?')
    .bind(c.req.param('id'))
    .run();
  return c.json({ message: 'User deleted' });
});

export default auth;
