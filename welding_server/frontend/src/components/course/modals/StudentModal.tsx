import React from 'react'
import { X, Save } from 'lucide-react'
import { Student, HomeClass } from '../types'

interface StudentModalProps {
  show: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  studentForm: {
    student_id: string;
    name: string;
    class_group_id: string | number;
  };
  setStudentForm: (form: any) => void;
  onSave: () => void;
  homeClasses: HomeClass[];
}

const StudentModal: React.FC<StudentModalProps> = ({
  show,
  onClose,
  editingStudent,
  studentForm,
  setStudentForm,
  onSave,
  homeClasses
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {editingStudent ? 'Edit Student' : 'New Student'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Registration Number *</label>
            <input
              type="text"
              required
              value={studentForm.student_id}
              onChange={e => setStudentForm({ ...studentForm, student_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 font-mono"
              placeholder="e.g. 2024B1001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={studentForm.name}
              onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Home Class</label>
            <select
              value={studentForm.class_group_id}
              onChange={e => setStudentForm({ ...studentForm, class_group_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Home Class</option>
              {homeClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!studentForm.student_id || !studentForm.name}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingStudent ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentModal
