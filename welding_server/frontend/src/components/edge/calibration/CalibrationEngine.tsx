import React from 'react'
import { RefreshCw, Play } from 'lucide-react'

interface CalibrationEngineProps {
  imageCount: number;
  isProcessing: boolean;
  onStart: () => void;
  onBack: () => void;
}

const CalibrationEngine: React.FC<CalibrationEngineProps> = ({ 
  imageCount, 
  isProcessing, 
  onStart, 
  onBack 
}) => {
  return (
    <div className="space-y-8 py-12 text-center animate-in zoom-in-95 duration-500">
      <div className="relative w-32 h-32 mx-auto">
        <div className={`absolute inset-0 bg-blue-500/20 rounded-full blur-3xl transition-opacity ${isProcessing ? 'opacity-100' : 'opacity-0'}`} />
        <div className="relative w-32 h-32 bg-slate-950 border-4 border-slate-800 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <RefreshCw className={`w-16 h-16 text-blue-500 transition-all ${isProcessing ? 'animate-spin' : 'rotate-45 opacity-40'}`} />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-3xl font-black text-white tracking-tight">Compute Parameters</h4>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          The OpenCV engine is ready to process <span className="text-white font-bold">{imageCount}</span> stereo pairs. 
          This will calculate focal length, baseline, and distortion coefficients.
        </p>
      </div>
      
      {!isProcessing ? (
        <div className="pt-4">
          <button
            onClick={onStart}
            className="group relative px-16 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-xl flex items-center gap-4 mx-auto transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] active:scale-95"
          >
            <Play className="w-6 h-6 fill-current" />
            Start Engine
          </button>
        </div>
      ) : (
        <div className="mt-12 space-y-6 max-w-xs mx-auto">
          <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 p-0.5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full animate-progress-indefinite" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-blue-400 text-sm font-black uppercase tracking-tighter animate-pulse">Bundle Adjustment</p>
            <p className="text-slate-500 text-xs font-mono">Optimizing reprojection error...</p>
          </div>
        </div>
      )}
      
      <button 
        disabled={isProcessing} 
        onClick={onBack} 
        className="block mt-12 text-slate-500 hover:text-white font-bold transition-colors disabled:opacity-0"
      >
        ← Back to collection
      </button>
    </div>
  )
}

export default CalibrationEngine
