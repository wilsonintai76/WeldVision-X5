/**
 * Authentication API Service
 */

const API_BASE = '/api';

// Helper to get CSRF token from cookies
function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Fetch with credentials and CSRF token
async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Important for session cookies
  });
  
  return response;
}

export const authAPI = {
  // Get CSRF token
  async getCSRFToken() {
    const response = await authFetch('/auth/csrf/');
    return response.json();
  },
  
  // Check authentication status
  async checkAuth() {
    const response = await authFetch('/auth/check/');
    return response.json();
  },
  
  // Login
  async login(credentials) {
    // Ensure CSRF token is fetched first
    await this.getCSRFToken();
    
    const response = await authFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.non_field_errors?.[0] || data.detail || 'Login failed');
    }
    return data;
  },
  
  // Logout
  async logout() {
    const response = await authFetch('/auth/logout/', {
      method: 'POST',
    });
    return response.json();
  },
  
  // Register
  async register(userData) {
    const response = await authFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      // Format validation errors
      const errors = [];
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
  async getProfile() {
    const response = await authFetch('/auth/profile/');
    if (!response.ok) {
      throw new Error('Failed to get profile');
    }
    return response.json();
  },
  
  // Update profile
  async updateProfile(data) {
    const response = await authFetch('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    return response.json();
  },
  
  // Change password
  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    const response = await authFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.old_password?.[0] || data.new_password?.[0] || 'Password change failed');
    }
    return data;
  },
  
  // Admin: Get all users
  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await authFetch(`/users/?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get users');
    }
    return response.json();
  },
  
  // Admin: Get pending users
  async getPendingUsers() {
    const response = await authFetch('/users/pending/');
    if (!response.ok) {
      throw new Error('Failed to get pending users');
    }
    return response.json();
  },
  
  // Admin: Approve user
  async approveUser(userId, approve = true) {
    const response = await authFetch(`/users/${userId}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ approve }),
    });
    if (!response.ok) {
      throw new Error('Failed to approve user');
    }
    return response.json();
  },
  
  // Admin: Update user
  async updateUser(userId, data) {
    const response = await authFetch(`/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    return response.json();
  },
  
  // Admin: Delete user
  async deleteUser(userId) {
    const response = await authFetch(`/users/${userId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    return { success: true };
  },
  
  // Admin: Get audit logs
  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await authFetch(`/audit-logs/?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get audit logs');
    }
    return response.json();
  },
  
  // Get available classes for registration
  async getAvailableClasses() {
    const response = await authFetch('/auth/available-classes/');
    if (!response.ok) {
      throw new Error('Failed to get available classes');
    }
    return response.json();
  },
  
  // Forgot password - reset to default
  async forgotPassword(username) {
    const response = await authFetch('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.username?.[0] || data.detail || 'Password reset failed');
    }
    return data;
  },
  
  // Force change password (for must_change_password users)
  async forceChangePassword(newPassword, newPasswordConfirm) {
    const response = await authFetch('/auth/force-change-password/', {
      method: 'POST',
      body: JSON.stringify({
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.new_password?.[0] || data.new_password_confirm?.[0] || data.detail || 'Password change failed');
    }
    return data;
  },
};

export default authAPI;
