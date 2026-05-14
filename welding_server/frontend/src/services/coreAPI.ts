/**
 * Core API Service for Classes, Students, Sessions, Courses
 *
 * Cloud migration: switched from Django session/CSRF to JWT Bearer tokens.
 * Token is read from localStorage via authAPI helpers.
 */

import { getStoredToken } from './authAPI';

const API_BASE = '/api';

// ── Base fetch with Bearer token ──────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${API_BASE}${url}`, { ...options, headers });
}

export const coreAPI = {
  // Classes
  async getClasses(): Promise<any> {
    const response = await apiFetch('/classes');
    if (!response.ok) {
      throw new Error('Failed to get classes');
    }
    return response.json();
  },
  
  async getClass(id: number | string): Promise<any> {
    const response = await apiFetch(`/classes/${id}`);
    if (!response.ok) {
      throw new Error('Failed to get class');
    }
    return response.json();
  },
  
  async createClass(data: any): Promise<any> {
    const response = await apiFetch('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create class');
    }
    return response.json();
  },
  
  async updateClass(id: number | string, data: any): Promise<any> {
    const response = await apiFetch(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update class');
    }
    return response.json();
  },
  
  async deleteClass(id: number | string): Promise<{ success: boolean }> {
    const response = await apiFetch(`/classes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete class');
    }
    return { success: true };
  },
  
  // Students
  async getStudents(filters: Record<string, any> = {}): Promise<any> {
    const params = new URLSearchParams(filters);
    const response = await apiFetch(`/students?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get students');
    }
    return response.json();
  },
  
  async getStudentsByClass(classId: number | string): Promise<any> {
    const response = await apiFetch(`/students?class_group_id=${classId}`);
    if (!response.ok) throw new Error('Failed to get students');
    return response.json();
  },
  
  async createStudent(data: any): Promise<any> {
    const response = await apiFetch('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create student');
    }
    return response.json();
  },
  
  async updateStudent(id: number | string, data: any): Promise<any> {
    const response = await apiFetch(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update student');
    }
    return response.json();
  },
  
  async deleteStudent(id: number | string): Promise<{ success: boolean }> {
    const response = await apiFetch(`/students/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete student');
    }
    return { success: true };
  },
  
  async bulkImportStudents(file: File, classId: number | string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', String(classId));

    const token = getStoredToken();
    const response = await fetch(`${API_BASE}/students/bulk-import`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json() as any;
      throw new Error(data.error || 'Failed to import students');
    }
    return response.json();
  },
  
  // Instructors
  async getInstructors(): Promise<any> {
    const response = await apiFetch('/instructors');
    if (!response.ok) {
      throw new Error('Failed to get instructors');
    }
    return response.json();
  },
  
  // Sessions (Academic Semesters)
  async getSessions(): Promise<any> {
    const response = await apiFetch('/sessions');
    if (!response.ok) {
      throw new Error('Failed to get sessions');
    }
    return response.json();
  },
  
  async getActiveSession(): Promise<any> {
    const response = await apiFetch('/sessions/active');
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get active session');
    return response.json();
  },
  
  async createSession(data: any): Promise<any> {
    const response = await apiFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    return response.json();
  },
  
  async updateSession(id: number | string, data: any): Promise<any> {
    const response = await apiFetch(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    return response.json();
  },
  
  async deleteSession(id: number | string): Promise<{ success: boolean }> {
    const response = await apiFetch(`/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
    return { success: true };
  },
  
  async setActiveSession(id: number | string): Promise<any> {
    const response = await apiFetch(`/sessions/${id}/activate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to set active session');
    return response.json();
  },
  
  // Courses
  async getCourses(filters: Record<string, any> = {}): Promise<any> {
    const params = new URLSearchParams(filters);
    const paramStr = params.toString();
    const response = await apiFetch(`/courses${paramStr ? `?${paramStr}` : ''}`);
    if (!response.ok) {
      throw new Error('Failed to get courses');
    }
    return response.json();
  },
  
  async getCourse(id: number | string): Promise<any> {
    const response = await apiFetch(`/courses/${id}`);
    if (!response.ok) {
      throw new Error('Failed to get course');
    }
    return response.json();
  },
  
  async createCourse(data: any): Promise<any> {
    const response = await apiFetch('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create course');
    }
    return response.json();
  },
  
  async updateCourse(id: number | string, data: any): Promise<any> {
    const response = await apiFetch(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update course');
    }
    return response.json();
  },
  
  async deleteCourse(id: number | string): Promise<{ success: boolean }> {
    const response = await apiFetch(`/courses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete course');
    }
    return { success: true };
  },
  
  async getCourseStudents(courseId: number | string): Promise<any> {
    const response = await apiFetch(`/students?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to get course students');
    return response.json();
  },

  async enrollStudents(courseId: number | string, studentIds: (number | string)[]): Promise<any> {
    // Enroll each student individually
    const results = await Promise.allSettled(
      studentIds.map(sid =>
        apiFetch(`/students/${sid}/enroll`, {
          method: 'POST',
          body: JSON.stringify({ course_id: courseId }),
        })
      )
    );
    return { enrolled: results.filter(r => r.status === 'fulfilled').length };
  },

  async unenrollStudents(_courseId: number | string, _studentIds: (number | string)[]): Promise<any> {
    // Not yet implemented in cloud API
    return { unenrolled: 0 };
  },
  
  async importPDF(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getStoredToken();
    const response = await fetch(`${API_BASE}/courses/import-pdf`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const data = await response.json() as any;
      throw new Error(data.error || 'Failed to import PDF');
    }
    return response.json();
  },
};

// ── Storage / R2 upload ───────────────────────────────────────────────────────

export const storageAPI = {
  async uploadFile(
    file: File,
    folder = 'images/training',
    onProgress?: (pct: number) => void,
  ): Promise<{ key: string; url: string }> {
    return new Promise((resolve, reject) => {
      const token = getStoredToken();
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/storage/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },

  async uploadMultiple(
    files: File[],
    folder = 'images/training',
    onProgress?: (done: number, total: number) => void,
  ): Promise<Array<{ key: string; url: string }>> {
    const results: Array<{ key: string; url: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const result = await storageAPI.uploadFile(files[i], folder);
      results.push(result);
      onProgress?.(i + 1, files.length);
    }
    return results;
  },
};

export default coreAPI;
