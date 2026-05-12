export interface ManagedUser {
  id: number;
  username: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'instructor' | 'student';
  is_approved: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  username?: string;
  action: string;
  action_display: string;
  model_name?: string;
  object_repr?: string;
  ip_address?: string;
}
