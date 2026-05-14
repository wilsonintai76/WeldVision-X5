import { FC } from 'react'
import { ExternalLink, ChevronRight } from 'lucide-react'
import { GITHUB_ACTIONS_URL, COLAB_NOTEBOOK_URL, ROBOFLOW_URL } from './types'

const STEPS = [
  { step: '01', label: 'Label',   sub: 'Roboflow',       url: ROBOFLOW_URL,       color: 'hover:border-violet-600/50' },
  { step: '02', label: 'Train',   sub: 'Google Colab',   url: COLAB_NOTEBOOK_URL, color: 'hover:border-amber-600/50'  },
  { step: '03', label: 'Compile', sub: 'GitHub Actions', url: GITHUB_ACTIONS_URL, color: 'hover:border-slate-500'     },
  { step: '04', label: 'Deploy',  sub: 'RDK X5 Edge',   url: null,               color: ''                           },
]

export const PipelineSteps: FC = () => (
  <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {STEPS.map((s, i) => (
        <div
          key={i}
          className={`relative p-4 bg-slate-900 border border-slate-800 rounded-xl ${s.url ? `cursor-pointer ${s.color}` : ''} transition-colors group`}
          onClick={() => s.url && window.open(s.url, '_blank')}
        >
          <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1">{s.step}</div>
          <div className="text-white font-bold">{s.label}</div>
          <div className="text-xs text-slate-500">{s.sub}</div>
          {s.url && <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 absolute top-3 right-3 transition-colors" />}
          {i < 3 && <ChevronRight className="w-4 h-4 text-slate-700 absolute -right-3 top-1/2 -translate-y-1/2 z-10" />}
        </div>
      ))}
    </div>

    {/* Colab save warning */}
    <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-start gap-3 text-xs">
      <span className="text-amber-500 text-base shrink-0">☁</span>
      <div className="space-y-1">
        <p className="text-amber-300 font-semibold">Important: Save a copy of the notebook</p>
        <p className="text-amber-400/70">
          The Colab notebook loads read-only from GitHub. If you see a "Failed to save" error, go to{' '}
          <strong className="text-amber-200">File → Save a copy in Drive</strong> in Colab to create your own editable copy.
        </p>
      </div>
    </div>
  </>
)
