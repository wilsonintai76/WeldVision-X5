import { useState, useEffect, FC } from 'react'
import {
    History as HistoryIcon,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Loader2
} from 'lucide-react'

// Types
import { AssessmentEntry } from './history/types'

// Components
import AssessmentFilters from './history/AssessmentFilters'
import AssessmentTable from './history/AssessmentTable'
import Assessment3DModal from './history/Assessment3DModal'
import { getStoredToken } from '../services/authAPI'

const API_BASE = '/api'

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const History: FC = () => {
    const [assessments, setAssessments] = useState<AssessmentEntry[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentEntry | null>(null)
    const [show3DViewer, setShow3DViewer] = useState<boolean>(false)

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [dateFilter, setDateFilter] = useState<string>('')
    const [scoreFilter, setScoreFilter] = useState<string>('all')

    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1)
    const itemsPerPage = 12

    useEffect(() => {
        fetchAssessments()
    }, [])

    const fetchAssessments = async () => {
        setLoading(true)
        setError(null)
        try {
            const [assessmentsRes, evaluationsRes] = await Promise.all([
                fetch(`${API_BASE}/assessments`, { headers: authHeaders() }),
                fetch(`${API_BASE}/rubrics/evaluations`, { headers: authHeaders() })
            ])
            if (!assessmentsRes.ok) throw new Error('Failed to fetch assessments')
            const assessmentsData = await assessmentsRes.json() as any
            const evaluationsData = (evaluationsRes.ok ? await evaluationsRes.json() : []) as any

            const evaluationMap = new Map<number, AssessmentEntry>()
            const manuals = (Array.isArray(evaluationsData) ? evaluationsData : evaluationsData.results || []).map((e: any) => {
                const manual: AssessmentEntry = {
                    id: `manual-${e.id}`,
                    original_id: e.id,
                    student_name: e.student_name,
                    student_id: e.student_id,
                    timestamp: e.created_at,
                    final_score: e.total_score,
                    image_heatmap_url: null,
                    has_3d_data: !!e.assessment,
                    assessment: e.assessment,
                    evaluation_id: e.id,
                    type: 'manual',
                    rubric_name: e.rubric_name,
                    passed: e.passed
                }
                if (e.assessment) evaluationMap.set(e.assessment, manual)
                return manual
            })

            const scans = (Array.isArray(assessmentsData) ? assessmentsData : assessmentsData.results || [])
                .filter((a: any) => !evaluationMap.has(a.id))
                .map((a: any) => ({
                    ...a,
                    type: 'scan' as const,
                    timestamp: a.timestamp,
                    final_score: (a.final_score / 20),
                    has_3d_data: a.has_3d_data,
                    evaluation_id: a.evaluation_id
                }))

            const merged = [...scans, ...manuals].sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0
                const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0
                return dateB - dateA
            })
            setAssessments(merged)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredAssessments = assessments.filter(a => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!(a.student_name?.toLowerCase().includes(query) || a.student_id?.toLowerCase().includes(query))) return false
        }
        if (dateFilter) {
            if (!a.timestamp || new Date(a.timestamp).toISOString().split('T')[0] !== dateFilter) return false
        }
        if (scoreFilter !== 'all') {
            const score = a.final_score || 0
            if (scoreFilter === 'excellent' && score < 4.2) return false
            if (scoreFilter === 'good' && (score < 3.5 || score >= 4.2)) return false
            if (scoreFilter === 'fair' && (score < 2.5 || score >= 3.5)) return false
            if (scoreFilter === 'poor' && score >= 2.5) return false
        }
        return true
    })

    const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage)
    const paginatedAssessments = filteredAssessments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const handleView3D = (assessmentId: number) => {
        const assessment = assessments.find(a => (a.type === 'scan' && a.id === assessmentId) || (a.type === 'manual' && a.assessment === assessmentId))
        if (assessment) {
            setSelectedAssessment({ ...assessment, id: assessmentId })
            setShow3DViewer(true)
        }
    }

    const handleDownloadPLY = (assessmentId: number) => {
        window.open(`${API_BASE}/assessments/${assessmentId}/download-ply/`, '_blank')
    }

    const handleDownloadReport = (assessment: AssessmentEntry) => {
        const evalId = assessment.type === 'manual' ? assessment.original_id : assessment.evaluation_id
        if (!evalId) return alert('No report available')
        window.open(`${API_BASE}/student-evaluations/${evalId}/report_pdf/`, '_blank')
    }

    const getScoreColor = (score: number) => {
        if (score >= 4.2) return 'text-emerald-400'
        if (score >= 3.5) return 'text-blue-400'
        if (score >= 3.0) return 'text-amber-400'
        return 'text-red-400'
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-6">
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <HistoryIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Assessment History</h1>
                    <p className="text-slate-400 text-sm">Review past weld assessments and manage 3D data</p>
                </div>
            </div>

            <AssessmentFilters
                searchQuery={searchQuery}
                setSearchQuery={(q) => { setSearchQuery(q); setCurrentPage(1) }}
                dateFilter={dateFilter}
                setDateFilter={(d) => { setDateFilter(d); setCurrentPage(1) }}
                scoreFilter={scoreFilter}
                setScoreFilter={(s) => { setScoreFilter(s); setCurrentPage(1) }}
                filteredCount={paginatedAssessments.length}
                totalCount={filteredAssessments.length}
            />

            {loading && (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                    <p className="text-slate-500">Fetching records...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-lg mx-auto">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={fetchAssessments} className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">Retry</button>
                </div>
            )}

            {!loading && !error && (
                <>
                    <AssessmentTable
                        assessments={paginatedAssessments}
                        handleDownloadReport={handleDownloadReport}
                        handleView3D={handleView3D}
                        handleDownloadPLY={handleDownloadPLY}
                        getScoreColor={getScoreColor}
                    />

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Previous page" className="p-2.5 rounded-xl bg-slate-800 text-white disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                            <span className="text-slate-400 font-bold px-4">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next page" className="p-2.5 rounded-xl bg-slate-800 text-white disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    )}
                </>
            )}

            {show3DViewer && selectedAssessment && (
                <Assessment3DModal
                    show={show3DViewer}
                    onClose={() => { setShow3DViewer(false); setSelectedAssessment(null) }}
                    assessment={selectedAssessment}
                    handleDownloadPLY={handleDownloadPLY}
                    handleDownloadReport={handleDownloadReport}
                    getScoreColor={getScoreColor}
                />
            )}
        </div>
    )
}

export default History
