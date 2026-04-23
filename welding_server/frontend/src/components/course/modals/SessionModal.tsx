import React from 'react'
import { X, Save } from 'lucide-react'
import { Session } from '../types'

interface SessionModalProps {
  show: boolean;
  onClose: () => void;
  editingSession: Session | null;
  sessionForm: {
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
  };
  setSessionForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SessionModal: React.FC<SessionModalProps> = ({
  show,
  onClose,
  editingSession,
  sessionForm,
  setSessionForm,
  onSubmit
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {editingSession ? 'Edit Session' : 'New Session'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Session Name *</label>
            <input
              type="text"
              required
              value={sessionForm.name}
              onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 2023/2024 Semester 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={sessionForm.start_date}
                onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
              <input
                type="date"
                value={sessionForm.end_date}
                onChange={e => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="is_active"
              checked={sessionForm.is_active}
              onChange={e => setSessionForm({ ...sessionForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">Set as Active Session</label>
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
              {editingSession ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SessionModal
