import React from 'react'
import { X, Save } from 'lucide-react'
import { HomeClass } from '../types'

interface HomeClassModalProps {
  show: boolean;
  onClose: () => void;
  editingClass: HomeClass | null;
  classForm: {
    name: string;
    description: string;
  };
  setClassForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const HomeClassModal: React.FC<HomeClassModalProps> = ({
  show,
  onClose,
  editingClass,
  classForm,
  setClassForm,
  onSubmit
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {editingClass ? 'Edit Home Class' : 'New Home Class'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Class Name *</label>
            <input
              type="text"
              required
              value={classForm.name}
              onChange={e => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 1DKA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={classForm.description}
              onChange={e => setClassForm({ ...classForm, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              rows={3}
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
              {editingClass ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HomeClassModal
