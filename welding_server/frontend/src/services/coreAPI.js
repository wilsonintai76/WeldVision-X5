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
  
  async bulkImportStudents(file, classId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', classId);
    
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_BASE}/students/bulk_import/`, {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to import students');
    }
    return response.json();
  },
  
  // Instructors
  async getInstructors() {
    const response = await apiFetch('/users/?role=instructor');
    if (!response.ok) {
      throw new Error('Failed to get instructors');
    }
    return response.json();
  },

  // Sessions (Academic Semesters)
  async getSessions() {
    const response = await apiFetch('/sessions/');
    if (!response.ok) {
      throw new Error('Failed to get sessions');
    }
    return response.json();
  },

  async getActiveSession() {
    const response = await apiFetch('/sessions/active/');
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to get active session');
    }
    return response.json();
  },

  async createSession(data) {
    const response = await apiFetch('/sessions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    return response.json();
  },

  async updateSession(id, data) {
    const response = await apiFetch(`/sessions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    return response.json();
  },

  async deleteSession(id) {
    const response = await apiFetch(`/sessions/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
    return { success: true };
  },

  async setActiveSession(id) {
    const response = await apiFetch(`/sessions/${id}/set_active/`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to set active session');
    }
    return response.json();
  },

  // Courses
  async getCourses(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await apiFetch(`/courses/?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get courses');
    }
    return response.json();
  },

  async getCourse(id) {
    const response = await apiFetch(`/courses/${id}/`);
    if (!response.ok) {
      throw new Error('Failed to get course');
    }
    return response.json();
  },

  async createCourse(data) {
    const response = await apiFetch('/courses/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create course');
    }
    return response.json();
  },

  async updateCourse(id, data) {
    const response = await apiFetch(`/courses/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update course');
    }
    return response.json();
  },

  async deleteCourse(id) {
    const response = await apiFetch(`/courses/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete course');
    }
    return { success: true };
  },

  async getCourseStudents(courseId) {
    const response = await apiFetch(`/courses/${courseId}/students/`);
    if (!response.ok) {
      throw new Error('Failed to get course students');
    }
    return response.json();
  },

  async enrollStudents(courseId, studentIds) {
    const response = await apiFetch(`/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to enroll students');
    }
    return response.json();
  },

  async unenrollStudents(courseId, studentIds) {
    const response = await apiFetch(`/courses/${courseId}/unenroll/`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to unenroll students');
    }
    return response.json();
  },

  async importPDF(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_BASE}/courses/import_pdf/`, {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to import PDF');
    }
    return response.json();
  },
};

export default coreAPI;
