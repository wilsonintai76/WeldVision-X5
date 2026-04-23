import React from 'react'
import { FileText, Eye, Download, CheckCircle, XCircle } from 'lucide-react'
import { AssessmentEntry } from './types'

interface AssessmentTableProps {
  assessments: AssessmentEntry[];
  handleDownloadReport: (a: AssessmentEntry) => void;
  handleView3D: (id: number) => void;
  handleDownloadPLY: (id: number) => void;
  getScoreColor: (score: number) => string;
}

const AssessmentTable: React.FC<AssessmentTableProps> = ({
  assessments,
  handleDownloadReport,
  handleView3D,
  handleDownloadPLY,
  getScoreColor
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Date & Time</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Type</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Score</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Result</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {assessments.map((assessment) => (
              <tr key={assessment.id} className="hover:bg-slate-800/40 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 shadow-sm">
                      {assessment.student_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{assessment.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{assessment.student_id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="text-sm text-slate-300 font-medium">
                    {new Date(assessment.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">
                    {new Date(assessment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${assessment.type === 'scan' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                    {assessment.type === 'scan' ? 'AI Scan' : (assessment.rubric_name || 'Manual')}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <div className={`text-xl font-black italic ${getScoreColor(assessment.final_score)}`}>
                    {assessment.final_score?.toFixed(1) || 'N/A'}
                    <span className="text-[10px] text-slate-600 ml-1 not-italic tracking-tighter">/ 5.0</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  {assessment.final_score >= 3.0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                      <CheckCircle className="w-3 h-3" />
                      PASS
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20 shadow-sm shadow-red-500/5">
                      <XCircle className="w-3 h-3" />
                      FAIL
                    </div>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDownloadReport(assessment)}
                      className="p-2 bg-slate-800 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-all border border-slate-700 hover:border-emerald-500/40"
                      title="PDF Report"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {(assessment.type === 'scan' || assessment.assessment) && (
                      <>
                        <button
                          onClick={() => handleView3D(assessment.type === 'scan' ? (assessment.id as number) : assessment.assessment!)}
                          className="p-2 bg-slate-800 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 rounded-lg transition-all border border-slate-700 hover:border-purple-500/40"
                          title="View 3D"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPLY(assessment.type === 'scan' ? (assessment.id as number) : assessment.assessment!)}
                          className="p-2 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-slate-700 hover:border-blue-500/40"
                          title="Download PLY"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AssessmentTable
