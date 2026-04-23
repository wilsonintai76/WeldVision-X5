import React from 'react'
import { ClipboardCheck, Plus, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { Rubric, Criterion } from './types'

interface RubricCriteriaEditorProps {
  selectedRubric: Rubric | null;
  activateRubric: (id: number) => void;
  openCriterionModal: (c: Criterion | null) => void;
  deleteCriterion: (id: number) => void;
}

const RubricCriteriaEditor: React.FC<RubricCriteriaEditorProps> = ({
  selectedRubric,
  activateRubric,
  openCriterionModal,
  deleteCriterion
}) => {
  const categoryColors: Record<string, string> = {
    geometric: 'bg-blue-900/50 text-blue-400',
    visual: 'bg-purple-900/50 text-purple-400',
    technique: 'bg-emerald-900/50 text-emerald-400',
    safety: 'bg-orange-900/50 text-orange-400'
  }

  if (!selectedRubric) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <ClipboardCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Select a rubric to view and edit criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{selectedRubric.name}</h3>
            {!selectedRubric.is_active && (
              <button
                onClick={() => activateRubric(selectedRubric.id)}
                className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors uppercase font-bold"
              >
                Set Active
              </button>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {selectedRubric.description || 'No description'}
          </p>
        </div>
        <button
          onClick={() => openCriterionModal(null)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Criterion
        </button>
      </div>

      {/* Passing Score Info */}
      <div className="mb-4 p-3 bg-slate-950 rounded-lg flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Passing Score:</span>
          <span className="text-white font-bold">≥ {selectedRubric.passing_score}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(score => (
            <div
              key={score}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${score >= selectedRubric.passing_score
                ? 'bg-emerald-600 text-white'
                : 'bg-red-900/50 text-red-400'
                }`}
            >
              {score}
            </div>
          ))}
        </div>
      </div>

      {/* Criteria List */}
      {!selectedRubric.criteria || selectedRubric.criteria.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">No criteria defined</p>
          <p className="text-slate-600 text-sm mt-1">Add criteria to start evaluating students</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedRubric.criteria.map((criterion, idx) => (
            <div key={criterion.id} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-white font-medium">{criterion.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tighter ${categoryColors[criterion.category]}`}>
                        {criterion.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">WEIGHT: {criterion.weight}x</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openCriterionModal(criterion)}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => (criterion.id && deleteCriterion(criterion.id))}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Likert Scale Preview */}
              <div className="grid grid-cols-5 gap-2 text-[10px]">
                {[1, 2, 3, 4, 5].map(score => (
                  <div key={score} className="p-2 bg-slate-900 rounded text-center border border-slate-800/50">
                    <div className={`font-black mb-1 ${score >= selectedRubric.passing_score ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                      {score}
                    </div>
                    <div className="text-slate-400 line-clamp-1">{criterion[`score_${score}_label`]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RubricCriteriaEditor
