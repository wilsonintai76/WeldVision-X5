import React from 'react'
import { ClipboardCheck, Cpu, RotateCcw } from 'lucide-react'
import { Rubric, Metrics } from './types'

interface RubricPanelProps {
  selectedRubric: Rubric
  metrics: Metrics
  criterionScores: Record<number, number>
  aiSuggestedIds: Set<number>
  onUpdateScore: (criterionId: number, score: number) => void
  onRescoreAI: () => void
}

export const RubricPanel: React.FC<RubricPanelProps> = ({
  selectedRubric,
  metrics,
  criterionScores,
  aiSuggestedIds,
  onUpdateScore,
  onRescoreAI
}) => {
  const criteria = selectedRubric.criteria || []
  let totalWeighted = 0
  let totalWeight = 0
  criteria.forEach(c => {
    const score = criterionScores[c.id] || 3
    totalWeighted += score * c.weight
    totalWeight += c.weight
  })
  const avgScore = totalWeight > 0 ? (totalWeighted / totalWeight) : 0
  const isPassing = avgScore >= selectedRubric.passing_score

  return (
    <div className="bg-industrial-slate rounded-lg border-2 border-emerald-600 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-semibold text-white">Rubric Assessment: {selectedRubric.name}</h3>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400">AI</span> = auto-scored &nbsp;|&nbsp; click to override
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Current Score:</span>
          <span className="text-2xl font-bold text-emerald-400">
            {avgScore.toFixed(2)}
          </span>
          <span className="text-slate-500">/5</span>
          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
            isPassing ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {isPassing ? 'PASSING' : 'FAILING'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {criteria.map(criterion => {
          const isAI = aiSuggestedIds.has(criterion.id)
          return (
            <div key={criterion.id} className={`rounded-lg p-4 border transition-all ${
              isAI ? 'bg-blue-950/30 border-blue-600/50' : 'bg-slate-800 border-slate-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{criterion.name}</span>
                  {isAI && (
                    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Cpu className="w-3 h-3" /> AI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isAI && (
                    <button
                      onClick={onRescoreAI}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Re-score from current AI metrics"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-slate-400 text-xs">Weight: {criterion.weight}</span>
                </div>
              </div>
              {criterion.description && (
                <p className="text-slate-400 text-sm mb-3">{criterion.description}</p>
              )}

              {/* Likert Scale Buttons */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(score => {
                  const currentScore = criterionScores[criterion.id] || 3
                  const isSelected = currentScore === score
                  return (
                    <button
                      key={score}
                      onClick={() => onUpdateScore(criterion.id, score)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
