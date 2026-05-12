import React from 'react'
import { X, Save } from 'lucide-react'
import { Course, Session, Instructor } from '../types'

interface CourseModalProps {
  show: boolean;
  onClose: () => void;
  editingCourse: Course | null;
  courseForm: {
    code: string;
    name: string;
    section: string;
    session: string | number;
    instructor: string | number;
    description: string;
  };
  setCourseForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  sessions: Session[];
  instructors: Instructor[];
}

const CourseModal: React.FC<CourseModalProps> = ({
  show,
  onClose,
  editingCourse,
  courseForm,
  setCourseForm,
  onSubmit,
  sessions,
  instructors
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {editingCourse ? 'Edit Course' : 'New Course'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Course Code *</label>
              <input
                type="text"
                required
                value={courseForm.code}
                onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="e.g. WLD101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Section</label>
              <input
                type="text"
                value={courseForm.section}
                onChange={e => setCourseForm({ ...courseForm, section: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. S1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Course Name *</label>
            <input
              type="text"
              required
              value={courseForm.name}
              onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Basic Arc Welding"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Academic Session *</label>
            <select
              required
              aria-label="Academic Session"
              value={courseForm.session}
              onChange={e => setCourseForm({ ...courseForm, session: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Instructor</label>
            <select
              aria-label="Instructor"
              value={courseForm.instructor}
              onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Instructor</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name || (i.first_name || i.last_name ? `${i.first_name || ''} ${i.last_name || ''}`.trim() : '') || i.username} ({i.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              aria-label="Description"
              placeholder="Course description (optional)"
              value={courseForm.description}
              onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingCourse ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CourseModal
