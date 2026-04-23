import React from 'react'
import { X, Save } from 'lucide-react'
import { Rubric, RubricForm as RubricFormType } from './types'

interface RubricModalProps {
  show: boolean;
  onClose: () => void;
  editingRubric: Rubric | null;
  rubricForm: RubricFormType;
  setRubricForm: (f: RubricFormType) => void;
  onSubmit: () => void;
  loading: boolean;
}

const RubricModal: React.FC<RubricModalProps> = ({
  show,
  onClose,
  editingRubric,
  rubricForm,
  setRubricForm,
  onSubmit,
  loading
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            {editingRubric ? 'Edit Rubric' : 'New Rubric'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Rubric Name *</label>
            <input
              type="text"
              value={rubricForm.name}
              onChange={(e) => setRubricForm({ ...rubricForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g., SMAW Basic Assessment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
            <select
              value={rubricForm.rubric_type}
              onChange={(e) => setRubricForm({ ...rubricForm, rubric_type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="custom">Custom Rubric</option>
              <option value="iso_5817">ISO 5817</option>
              <option value="aws_d1_1">AWS D1.1</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Passing Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={rubricForm.passing_score}
              onChange={(e) => setRubricForm({ ...rubricForm, passing_score: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Avg score required to pass</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={rubricForm.description}
              onChange={(e) => setRubricForm({ ...rubricForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Rubric description..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={loading || !rubricForm.name}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
            >
              <Save className="w-4 h-4" />
              {editingRubric ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RubricModal
