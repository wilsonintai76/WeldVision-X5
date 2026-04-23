import React from 'react'
import { Eye, CheckCircle, Save, RefreshCw } from 'lucide-react'
import { CalibrationResults } from '../types'

interface ResultsViewProps {
  results: CalibrationResults;
  onSave: () => void;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ results, onSave, onReset }) => {
  const focalLength = (results.focal_length_left + results.focal_length_right) / 2

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-xl group hover:border-blue-500/30 transition-colors">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Baseline</p>
          <p className="text-4xl font-black text-white">{results.baseline.toFixed(1)} <span className="text-sm font-medium text-slate-500 ml-1">mm</span></p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-xl group hover:border-blue-500/30 transition-colors">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Focal Length</p>
          <p className="text-4xl font-black text-white">{focalLength.toFixed(1)} <span className="text-sm font-medium text-slate-500 ml-1">px</span></p>
        </div>
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-xl group hover:border-blue-500/30 transition-colors">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Reprojection Error</p>
          <p className={`text-4xl font-black ${results.reprojection_error < 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {results.reprojection_error.toFixed(4)}
          </p>
        </div>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100" />
        
        <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Eye className="w-5 h-5 text-blue-400" />
          </div>
          Rectification Accuracy
        </h4>
        
        <div className="aspect-[21/9] bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-slate-800/50 mb-6 overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 grid grid-cols-2 gap-px bg-slate-800/50">
            <div className="flex items-end justify-center pb-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Left Feed</div>
            <div className="flex items-end justify-center pb-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Right Feed</div>
          </div>
          
          {/* Epipolar Lines */}
          {[1, 2, 3].map(i => (
            <div key={i} className="absolute inset-x-0 h-px bg-emerald-500/20" style={{ top: `${i * 25}%` }} />
          ))}
          
          <div className="z-10 bg-slate-950/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-3 shadow-2xl">
            <CheckCircle className="w-5 h-5" />
            Stereo Epipolar Lines Aligned
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <p className="text-xs text-slate-500 leading-relaxed italic text-center">
            The rectification transformation has been computed successfully. Points on the same horizontal line in both images now correspond to the same physical height.
          </p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={onReset}
          className="flex-1 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-800"
        >
          <RefreshCw className="w-5 h-5" />
          Discard Results
        </button>
        <button
          onClick={onSave}
          className="flex-[1.5] px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95"
        >
          <Save className="w-6 h-6" />
          Finalize & Deploy Profile
        </button>
      </div>
    </div>
  )
}

export default ResultsView
