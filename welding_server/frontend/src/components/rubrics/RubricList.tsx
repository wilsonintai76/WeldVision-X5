import React from 'react'
import { ClipboardCheck, Edit2, Trash2 } from 'lucide-react'
import { Rubric } from './types'

interface RubricListProps {
  rubrics: Rubric[];
  selectedRubric: Rubric | null;
  setSelectedRubric: (r: Rubric) => void;
  openRubricModal: (r: Rubric) => void;
  deleteRubric: (id: number) => void;
}

const RubricList: React.FC<RubricListProps> = ({
  rubrics,
  selectedRubric,
  setSelectedRubric,
  openRubricModal,
  deleteRubric
}) => {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Rubrics</h3>

      {rubrics.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No rubrics yet</p>
          <p className="text-slate-600 text-xs mt-1">Create one or use ISO 5817 template</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rubrics.map(rubric => (
            <div
              key={rubric.id}
              onClick={() => setSelectedRubric(rubric)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${selectedRubric?.id === rubric.id
                ? 'bg-blue-600/20 border-2 border-blue-500'
                : 'bg-slate-950 hover:bg-slate-800 border-2 border-transparent'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-medium">{rubric.name}</h4>
                    {rubric.is_active && (
                      <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded uppercase font-bold tracking-tighter">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {rubric.criteria_count || 0} criteria • Pass: ≥{rubric.passing_score}
                  </p>
                  <span className="text-[10px] text-slate-600 font-mono">{rubric.rubric_type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openRubricModal(rubric) }}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRubric(rubric.id) }}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RubricList
