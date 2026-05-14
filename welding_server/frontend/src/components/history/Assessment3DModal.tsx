import React, { useState, useEffect } from 'react'
import { Box, User, Calendar, Download, X, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import WeldViewer3D from '../WeldViewer3D'
import { AssessmentEntry } from './types'
import { getStoredToken } from '../../services/authAPI'

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface LikertMetrics {
  weld_width: number;
  reinforcement_height: number;
  undercut_depth: number;
  spatter_count: number;
  porosity_count: number;
  width_uniformity: number;
  height_uniformity: number;
  total_score: number;
  grade_band: string;
}

const CRITERION_LABELS: Record<keyof Omit<LikertMetrics, 'total_score' | 'grade_band'>, string> = {
  weld_width:           'Weld Width',
  reinforcement_height: 'Reinforcement Height',
  undercut_depth:       'Undercut Depth',
  spatter_count:        'Spatter Count',
  porosity_count:       'Surface Porosity',
  width_uniformity:     'Width Uniformity',
  height_uniformity:    'Height Uniformity',
};

const CRITERION_WEIGHTS: Record<keyof Omit<LikertMetrics, 'total_score' | 'grade_band'>, string> = {
  weld_width:           '20%',
  reinforcement_height: '25%',
  undercut_depth:       '20%',
  spatter_count:        '10%',
  porosity_count:       '10%',
  width_uniformity:     '10%',
  height_uniformity:     '5%',
};

function gradeBadgeClass(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'B': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'C': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'D': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:  return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-blue-400';
  if (score >= 70) return 'text-amber-400';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-400';
}

function likertBarColor(score: number): string {
  if (score >= 5) return 'bg-emerald-400';
  if (score >= 4) return 'bg-blue-400';
  if (score >= 3) return 'bg-amber-400';
  if (score >= 2) return 'bg-yellow-500';
  return 'bg-red-500';
}

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
}) => {
  const [likert, setLikert] = useState<LikertMetrics | null>(null)
  const [rejected, setRejected] = useState<boolean>(assessment.rejected ?? false)
  const [rejectionReason, setRejectionReason] = useState<string>(assessment.rejection_reason ?? '')
  const [showRejectPanel, setShowRejectPanel] = useState<boolean>(false)
  const [rejectInput, setRejectInput] = useState<string>('')
  const [rejectLoading, setRejectLoading] = useState<boolean>(false)

  // Determine role from JWT (stored in localStorage)
  const isInstructor = (() => {
    try {
      const token = getStoredToken();
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'admin' || payload.role === 'instructor';
    } catch { return false; }
  })();

  useEffect(() => {
    if (!show || !assessment.id) return;
    setRejected(assessment.rejected ?? false);
    setRejectionReason(assessment.rejection_reason ?? '');
    setShowRejectPanel(false);

    const numId = assessment.type === 'scan' ? assessment.id : assessment.assessment;
    if (!numId) return;

    fetch(`/api/assessments/${numId}/metrics`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then((rows: any) => {
        if (!Array.isArray(rows)) return;
        const map: Record<string, number | string> = {};
        rows.forEach((r: any) => {
          map[r.metric_key] = r.metric_value ?? r.metric_text;
        });
        const l: Partial<LikertMetrics> = {};
        const keys = ['weld_width', 'reinforcement_height', 'undercut_depth',
                      'spatter_count', 'porosity_count', 'width_uniformity', 'height_uniformity'] as const;
        keys.forEach(k => {
          const v = map[`rubric.${k}.likert`];
          if (typeof v === 'number') (l as any)[k] = v;
        });
        const total = map['rubric.total_score'];
        const grade = map['rubric.grade_band'];
        if (typeof total === 'number') l.total_score = total;
        if (typeof grade === 'string') l.grade_band = grade;
        if (l.total_score !== undefined) setLikert(l as LikertMetrics);
      })
      .catch(() => null);
  }, [show, assessment]);

  const handleReject = async () => {
    const numId = assessment.type === 'scan' ? assessment.id : assessment.assessment;
    if (!numId) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/assessments/${numId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reason: rejectInput }),
      });
      if (res.ok) {
        setRejected(true);
        setRejectionReason(rejectInput);
        setShowRejectPanel(false);
      }
    } finally {
      setRejectLoading(false);
    }
  };

  if (!show) return null;

  const displayScore = likert?.total_score ?? assessment.final_score;
  const displayGrade = likert?.grade_band ?? assessment.grade_band ?? '';

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

        {/* Rejection banner */}
        {rejected && (
          <div className="flex items-center gap-3 bg-red-500/10 border-b border-red-500/20 px-5 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300 font-medium">Rejected – pending further NDT</span>
            {rejectionReason && (
              <span className="text-xs text-slate-500 ml-1">({rejectionReason})</span>
            )}
          </div>
        )}

        {/* Body: 3D viewer + Likert panel */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row min-h-0">
          {/* 3D Viewer */}
          <div className="flex-1 bg-black relative min-h-64">
            <WeldViewer3D
              assessmentId={assessment.id as number}
              className="w-full h-full"
              autoRotate
            />
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

          {/* Likert Rubric Breakdown */}
          {likert && (
            <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col gap-3 bg-slate-950/50 overflow-y-auto">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Rubric Breakdown</h3>
              {(Object.keys(CRITERION_LABELS) as Array<keyof typeof CRITERION_LABELS>).map(key => {
                const score = (likert as any)[key] as number | undefined;
                if (score === undefined) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{CRITERION_LABELS[key]}</span>
                      <span className="text-xs text-slate-500">{CRITERION_WEIGHTS[key]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5 flex-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div
                            key={n}
                            className={`h-2 flex-1 rounded-sm ${n <= score ? likertBarColor(score) : 'bg-slate-700'}`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-bold w-4 text-right ${likertBarColor(score).replace('bg-', 'text-')}`}>
                        {score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reject panel */}
        {showRejectPanel && !rejected && (
          <div className="border-t border-slate-800 px-5 py-4 bg-slate-950 flex items-center gap-3">
            <input
              type="text"
              placeholder="Rejection reason (optional)"
              value={rejectInput}
              onChange={e => setRejectInput(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleReject}
              disabled={rejectLoading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
            >
              {rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => setShowRejectPanel(false)}
              className="text-slate-400 hover:text-white text-sm px-3 py-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Final Score</div>
              <div className={`text-2xl font-black ${scoreColor(displayScore)}`}>
                {displayScore?.toFixed(1) || 'N/A'}
                <span className="text-xs text-slate-600">/100</span>
              </div>
            </div>
            {displayGrade && (
              <>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Grade</div>
                  <span className={`px-3 py-1 rounded-lg border text-sm font-black ${gradeBadgeClass(displayGrade)}`}>
                    {displayGrade}
                  </span>
                </div>
              </>
            )}
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Status</div>
              {rejected ? (
                <div className="text-sm font-bold text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Rejected
                </div>
              ) : (
                <div className={`text-sm font-bold flex items-center gap-1 ${displayScore >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {displayScore >= 60
                    ? <><CheckCircle className="w-3 h-3" /> Pass</>
                    : 'Re-weld Required'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isInstructor && !rejected && (
              <button
                onClick={() => setShowRejectPanel(v => !v)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-bold transition-colors border border-red-500/30 hover:border-red-500/60 rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-3 h-3" />
                Reject Coupon
              </button>
            )}
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
    </div>
  )
}

export default Assessment3DModal
