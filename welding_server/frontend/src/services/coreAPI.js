/**
 * Core API Service for Classes and Students
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
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  return response;
}

export const coreAPI = {
  // Classes
  async getClasses() {
    const response = await apiFetch('/classes/');
    if (!response.ok) {
      throw new Error('Failed to get classes');
    }
    return response.json();
  },
  
  async getClass(id) {
    const response = await apiFetch(`/classes/${id}/`);
    if (!response.ok) {
      throw new Error('Failed to get class');
    }
    return response.json();
  },
  
  async createClass(data) {
    const response = await apiFetch('/classes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create class');
    }
    return response.json();
  },
  
  async updateClass(id, data) {
    const response = await apiFetch(`/classes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update class');
    }
    return response.json();
  },
  
  async deleteClass(id) {
    const response = await apiFetch(`/classes/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete class');
    }
    return { success: true };
  },
  
  // Students
  async getStudents(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await apiFetch(`/students/?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get students');
    }
    return response.json();
  },
  
  async getStudentsByClass(classId) {
    const response = await apiFetch(`/students/by_class/?class_id=${classId}`);
    if (!response.ok) {
      throw new Error('Failed to get students');
    }
    return response.json();
  },
  
  async createStudent(data) {
    const response = await apiFetch('/students/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create student');
    }
    return response.json();
  },
  
  async updateStudent(id, data) {
    const response = await apiFetch(`/students/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update student');
    }
    return response.json();
  },
  
  async deleteStudent(id) {
    const response = await apiFetch(`/students/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete student');
    }
    return { success: true };
  },
};

export default coreAPI;
