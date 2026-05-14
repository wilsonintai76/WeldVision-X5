import { FC } from 'react'
import type { Model } from './types'

interface ModelCompareTableProps {
  models: Model[]
  sortKey: keyof Model
  onSortChange: (key: keyof Model) => void
}

const SORT_KEYS: (keyof Model)[] = ['map50', 'map50_95', 'f1_score', 'recall', 'epochs']

export const ModelCompareTable: FC<ModelCompareTableProps> = ({ models, sortKey, onSortChange }) => {
  const sorted = [...models].sort((a, b) => {
    const av = (a[sortKey] as number | undefined) ?? -1
    const bv = (b[sortKey] as number | undefined) ?? -1
    return bv - av
  })

  const pct = (v?: number) => (v != null ? `${(v * 100).toFixed(1)}%` : '—')
  const mb  = (b?: number) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '—')

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Version Comparison</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Sort by:
          {SORT_KEYS.map(k => (
            <button
              key={k}
              onClick={() => onSortChange(k)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                sortKey === k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {models.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No models yet — upload a .onnx above</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                {['Version', 'mAP@0.5', 'mAP@0.5:0.95', 'F1', 'Recall', 'Epochs', 'Dataset', 'Framework', 'Size', 'Status'].map(h => (
                  <th key={h} className="py-2 px-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sorted.map(m => {
                const isTop = sorted[0]?.id === m.id
                return (
                  <tr key={m.id} className={`transition-colors ${
                    m.is_deployed ? 'bg-emerald-950/20' : isTop ? 'bg-blue-950/20' : 'hover:bg-slate-800/30'
                  }`}>
                    <td className="py-3 px-3 font-mono text-white font-bold">
                      {m.version}
                      {m.is_deployed && <span className="ml-2 text-xs text-emerald-400">● live</span>}
                      {isTop && !m.is_deployed && <span className="ml-2 text-xs text-blue-400">★ best</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{pct(m.map50 ?? m.accuracy)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-300">{pct(m.map50_95)}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{pct(m.f1_score)}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{pct(m.recall)}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{m.epochs ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-400 text-xs">{m.dataset_version || '—'}</td>
                    <td className="py-3 px-3 text-slate-500 text-xs font-mono">{m.framework_version || '—'}</td>
                    <td className="py-3 px-3 text-slate-400 text-xs">{mb(m.model_size_bytes)}</td>
                    <td className="py-3 px-3"><span className="text-xs text-slate-500">{m.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
