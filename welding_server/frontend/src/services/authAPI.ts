/**
 * Authentication API Service
 *
 * Cloud migration: switched from Django session/CSRF to JWT Bearer tokens.
 * Token is stored in localStorage under the key 'wv_token'.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'wv_token';

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Base fetch with Bearer token ──────────────────────────────────────────────

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  // Auto-clear token on 401 (expired/invalid)
  if (response.status === 401) {
    clearStoredToken();
  }

  return response;
}

export const authAPI = {
  // Kept for backward compatibility — no-op in JWT mode (no CSRF needed)
  async getCSRFToken(): Promise<any> {
    return {};
  },

  // Check authentication status
  async checkAuth(): Promise<any> {
    const response = await authFetch('/auth/check');
    return response.json();
  },

  // Login — stores returned JWT token
  // Accepts { identifier, pin } for students/staff, or legacy { username, password } for admin
  async login(credentials: any): Promise<any> {
    // Normalise: if caller sends { username, password }, map to { identifier, pin }
    const body = credentials.identifier !== undefined
      ? credentials
      : { identifier: credentials.username, pin: credentials.password };

    const response = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg =
        data.error ||
        data.detail ||
        (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
        Object.values(data).flat()[0] ||
        'Login failed';
      throw new Error(String(msg));
    }
    if (data.token) setStoredToken(data.token);
    return data;
  },

  // Logout — clears local token (no server call needed for stateless JWT)
  async logout(): Promise<any> {
    clearStoredToken();
    return { detail: 'Logged out' };
  },

  // Register
  async register(userData: any): Promise<any> {
    const response = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      const errors: string[] = [];
      for (const [field, messages] of Object.entries(data)) {
        if (Array.isArray(messages)) {
          errors.push(`${field}: ${messages.join(', ')}`);
        } else {
          errors.push(`${field}: ${messages}`);
        }
      }
      throw new Error(errors.join('\n') || 'Registration failed');
    }
    return data;
  },

  // Get profile
  async getProfile(): Promise<any> {
    const response = await authFetch('/auth/profile');
    if (!response.ok) throw new Error('Failed to get profile');
    return response.json();
  },

  // Update profile
  async updateProfile(data: any): Promise<any> {
    const response = await authFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  // Change password
  async changePassword(oldPassword: string, newPassword: string, _newPasswordConfirm?: string): Promise<any> {
    const response = await authFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.old_password?.[0] || data.new_password?.[0] || 'Password change failed');
    }
    return data;
  },

  // Admin: Get all users
  async getUsers(filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams(filters);
    const response = await authFetch(`/auth/users${params.toString() ? '?' + params : ''}`);
    if (!response.ok) throw new Error('Failed to get users');
    return response.json();
  },

  // Admin: Get pending users
  async getPendingUsers(): Promise<any> {
    const response = await authFetch('/auth/users/pending');
    if (!response.ok) throw new Error('Failed to get pending users');
    return response.json();
  },

  // Admin: Approve user
  async approveUser(userId: number, _approve = true): Promise<any> {
    const response = await authFetch(`/auth/users/${userId}/approve`, {
      method: 'POST',
      body: '{}',
    });
    if (!response.ok) throw new Error('Failed to approve user');
    return response.json();
  },

  // Admin: Update user
  async updateUser(userId: number, data: any): Promise<any> {
    const response = await authFetch(`/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  // Admin: Delete user
  async deleteUser(userId: number): Promise<{ success: boolean }> {
    const response = await authFetch(`/auth/users/${userId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete user');
    return { success: true };
  },

  // Admin: Get audit logs (not yet implemented in cloud — returns empty)
  async getAuditLogs(_filters: Record<string, any> = {}): Promise<any> {
    return [];
  },

  // Get available classes for registration dropdown
  async getAvailableClasses(): Promise<any> {
    const response = await authFetch('/auth/available-classes');
    if (!response.ok) throw new Error('Failed to get available classes');
    return response.json();
  },

  // Forgot PIN — resets student PIN to their registration number (public endpoint, no auth)
  async forgotPin(identifier: string): Promise<any> {
    const response = await fetch(`${API_BASE}/auth/forgot-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'PIN reset failed');
    return data;
  },

  // Forgot password (kept for backward compatibility — delegates to forgotPin)
  async forgotPassword(identifier: string): Promise<any> {
    return this.forgotPin(identifier);
  },

  // Force change password/PIN (when must_change_password = true)
  async forceChangePassword(newPassword: string, _newPasswordConfirm?: string): Promise<any> {
    const response = await authFetch('/auth/force-change-password', {
      method: 'POST',
      body: JSON.stringify({ new_pin: newPassword, new_password: newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg =
        (Array.isArray(data.new_password) ? data.new_password[0] : null) ||
        (Array.isArray(data.new_password_confirm) ? data.new_password_confirm[0] : null) ||
        (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
        data.detail ||
        Object.values(data).flat()[0] ||
        'Password change failed';
      throw new Error(msg);
    }
    return data;
  },
};

export default authAPI;
