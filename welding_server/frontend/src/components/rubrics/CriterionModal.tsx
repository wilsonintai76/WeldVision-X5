import React from 'react'
import { X, Save } from 'lucide-react'
import { Criterion } from './types'

interface CriterionModalProps {
  show: boolean;
  onClose: () => void;
  editingCriterion: Criterion | null;
  criterionForm: Criterion;
  setCriterionForm: (f: Criterion) => void;
  onSubmit: () => void;
  loading: boolean;
}

const CriterionModal: React.FC<CriterionModalProps> = ({
  show,
  onClose,
  editingCriterion,
  criterionForm,
  setCriterionForm,
  onSubmit,
  loading
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            {editingCriterion ? 'Edit Criterion' : 'Add Criterion'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Criterion Name *</label>
              <input
                type="text"
                value={criterionForm.name}
                onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., Bead Uniformity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={criterionForm.category}
                onChange={(e) => setCriterionForm({ ...criterionForm, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="geometric">Geometric</option>
                <option value="visual">Visual</option>
                <option value="technique">Technique</option>
                <option value="safety">Safety</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Weight</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={criterionForm.weight}
                onChange={(e) => setCriterionForm({ ...criterionForm, weight: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Likert Scale Definitions (1-5)</h4>
            
            {[1, 2, 3, 4, 5].map(score => (
              <div key={score} className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-4 mb-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${score >= 3 ? 'bg-emerald-600 text-white' : 'bg-red-900/50 text-red-400'}`}>
                    {score}
                  </span>
                  <input
                    type="text"
                    value={criterionForm[`score_${score}_label`]}
                    onChange={(e) => setCriterionForm({ ...criterionForm, [`score_${score}_label`]: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder={`Label for score ${score}`}
                  />
                </div>
                <textarea
                  value={criterionForm[`score_${score}_description`]}
                  onChange={(e) => setCriterionForm({ ...criterionForm, [`score_${score}_description`]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  rows={2}
                  placeholder={`Detailed description of what constitutes a score of ${score}...`}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-slate-900 py-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={loading || !criterionForm.name}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
            >
              <Save className="w-4 h-4" />
              {editingCriterion ? 'Update Criterion' : 'Add Criterion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CriterionModal
