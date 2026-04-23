import React from 'react'
import { Box, User, Calendar, Download, X, FileText } from 'lucide-react'
import WeldViewer3D from '../WeldViewer3D'
import { AssessmentEntry } from './types'

interface Assessment3DModalProps {
  show: boolean;
  onClose: () => void;
  assessment: AssessmentEntry;
  handleDownloadPLY: (id: number) => void;
  handleDownloadReport: (a: AssessmentEntry) => void;
  getScoreColor: (score: number) => string;
}

const Assessment3DModal: React.FC<Assessment3DModalProps> = ({
  show,
  onClose,
  assessment,
  handleDownloadPLY,
  handleDownloadReport,
  getScoreColor
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8">
      <div className="bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <Box className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-none mb-1">
                Weld 3D High-Res Preview
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <User className="w-3 h-3" />
                <span>{assessment.student_name}</span>
                <span className="text-slate-700">•</span>
                <Calendar className="w-3 h-3" />
                <span>{new Date(assessment.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadPLY(assessment.id as number)}
              className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download PLY
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D Viewer Area */}
        <div className="flex-1 bg-black relative">
          <WeldViewer3D
            assessmentId={assessment.id as number}
            className="w-full h-full"
            autoRotate
          />

          {/* Overlay Controls Info */}
          <div className="absolute bottom-6 left-6 p-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/5 text-[10px] text-slate-300 pointer-events-none">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="opacity-50 uppercase tracking-tighter">Rotate</span>
              <span className="font-bold">Left Mouse</span>
              <span className="opacity-50 uppercase tracking-tighter">Zoom</span>
              <span className="font-bold">Scroll Wheel</span>
              <span className="opacity-50 uppercase tracking-tighter">Pan</span>
              <span className="font-bold">Right Mouse</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Final Score</div>
              <div className={`text-2xl font-black ${getScoreColor(assessment.final_score)}`}>
                {assessment.final_score?.toFixed(1) || 'N/A'}<span className="text-xs text-slate-600">/5</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Status</div>
              <div className={`text-sm font-bold ${assessment.final_score >= 3.0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {assessment.final_score >= 3.0 ? 'CERTIFIED PASS' : 'IMPROVEMENT REQ.'}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDownloadReport(assessment)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
          >
            <FileText className="w-4 h-4" />
            VIEW DETAILED REPORT
          </button>
        </div>
      </div>
    </div>
  )
}

export default Assessment3DModal
