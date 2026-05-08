// Cloudflare Workers bindings and shared types

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  GITHUB_PAT: string;
  EDGE_IMPULSE_WEBHOOK_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
}

export interface JWTPayload {
  [key: string]: unknown;  // required by hono/jwt
  sub: string;             // numeric id (string) of users.id or students.id
  username: string;        // staff_id / student_id
  role: 'admin' | 'instructor' | 'student';
  account_type: 'user' | 'student';  // which table was authenticated against
  exp: number;
  iat: number;
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  is_approved: number;
  must_change_password: number;
  first_name: string;
  last_name: string;
  student_profile_id: number | null;
  staff_id: string | null;   // login identifier for staff/admin PIN login
  pin_hash: string | null;   // PBKDF2 4-digit PIN hash
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: number;
  student_id: string;
  name: string;
  class_group_id: number | null;
  email: string | null;
  pin_hash: string | null;   // PBKDF2 4-digit PIN hash
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: number;
  student_id: number;
  timestamp: string;
  final_score: number | null;
  image_original_key: string | null;
  image_heatmap_key: string | null;
  metrics_json: string;
  notes: string;
  device_id: string;
  model_version: string;
  pointcloud_ply_key: string | null;
  mesh_preview_json: string | null;
  ai_evaluation_json: string | null;
  created_at: string;
}
