import { useState, useEffect } from 'react'
import {
    History as HistoryIcon,
    Download,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Calendar,
    User,
    Box,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    ExternalLink,
    ClipboardCheck,
    FileText
} from 'lucide-react'
import WeldViewer3D from './WeldViewer3D'

const API_BASE = '/api'

/**
 * History Page - Assessment history with 3D preview capabilities
 * 
 * Features:
 * - List all assessments in a TABLE format
 * - Tier 1: Web-based 3D preview (Student View) 
 * - Tier 2: Full PLY download (Instructor View)
 * - Report Generation for all assessed sessions
 */
export default function History() {
    console.log("HISTORY_TABLE_VERSION_2.1_LOADED");

    const [assessments, setAssessments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedAssessment, setSelectedAssessment] = useState(null)
    const [show3DViewer, setShow3DViewer] = useState(false)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState('')
    const [scoreFilter, setScoreFilter] = useState('all')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12

    // Fetch assessments
    useEffect(() => {
        fetchAssessments()
    }, [])

    const fetchAssessments = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch both automated assessments (scans) and manual evaluations
            const [assessmentsRes, evaluationsRes] = await Promise.all([
                fetch(`${API_BASE}/assessments/`),
                fetch(`${API_BASE}/student-evaluations/`, { credentials: 'include' })
            ])

            if (!assessmentsRes.ok) throw new Error('Failed to fetch assessments')

            const assessmentsData = await assessmentsRes.json()
            const evaluationsData = evaluationsRes.ok ? await evaluationsRes.json() : []

            // Normalize StudentEvaluations (Manual Grading)
            const evaluationMap = new Map()
            const manuals = (Array.isArray(evaluationsData) ? evaluationsData : evaluationsData.results || []).map(e => {
                const manual = {
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
                if (e.assessment) {
                    evaluationMap.set(e.assessment, manual)
                }
                return manual
            })

            // Normalize Assessments (RDK Scans)
            const scans = (Array.isArray(assessmentsData) ? assessmentsData : assessmentsData.results || [])
                .filter(a => !evaluationMap.has(a.id)) // Skip if already covered by an evaluation
                .map(a => ({
                    ...a,
                    type: 'scan',
                    timestamp: a.timestamp,
                    final_score: (a.final_score / 20), // Convert 0-100 to 0-5 scale for consistency
                    has_3d_data: a.has_3d_data,
                    evaluation_id: a.evaluation_id
                }))

            // Merge and Sort by Date (Desc)
            const merged = [...scans, ...manuals].sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0)
                const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0)
                return dateB - dateA
            })

            setAssessments(merged)
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Filter assessments
    const filteredAssessments = assessments.filter(a => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const name = a.student_name || ''
            const id = a.student_id || ''
            const matchesStudent = name.toLowerCase().includes(query) ||
                id.toLowerCase().includes(query)
            if (!matchesStudent) return false
        }

        // Date filter
        if (dateFilter) {
            if (!a.timestamp) return false
            try {
                const assessmentDate = new Date(a.timestamp).toISOString().split('T')[0]
                if (assessmentDate !== dateFilter) return false
            } catch (e) {
                return false
            }
        }

        // Score filter (on 0-5 scale)
        if (scoreFilter !== 'all') {
            const score = a.final_score || 0
            switch (scoreFilter) {
                case 'excellent': if (score < 4.2) return false; break
                case 'good': if (score < 3.5 || score >= 4.2) return false; break
                case 'fair': if (score < 2.5 || score >= 3.5) return false; break
                case 'poor': if (score >= 2.5) return false; break
            }
        }

        return true
    })

    // Pagination
    const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage)
    const paginatedAssessments = filteredAssessments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Handle 3D preview
    const handleView3D = (assessmentId) => {
        // Find full assessment details for 3D viewer
        const assessment = assessments.find(a =>
            (a.type === 'scan' && a.id === assessmentId) ||
            (a.type === 'manual' && a.assessment === assessmentId)
        );
        setSelectedAssessment({ ...assessment, id: assessmentId })
        setShow3DViewer(true)
    }

    // Handle PLY download
    const handleDownloadPLY = async (assessmentId) => {
        try {
            window.open(`${API_BASE}/assessments/${assessmentId}/download-ply/`, '_blank')
        } catch (err) {
            console.error('Download failed:', err)
        }
    }

    // Handle Report download
    const handleDownloadReport = (assessment) => {
        const evalId = assessment.type === 'manual' ? assessment.original_id : assessment.evaluation_id
        if (!evalId) {
            alert('No report available for this entry.')
            return
        }
        window.open(`${API_BASE}/student-evaluations/${evalId}/report_pdf/`, '_blank')
    }

    // Score badge color
    const getScoreColor = (score) => {
        if (score >= 4.2) return 'text-emerald-400'
        if (score >= 3.5) return 'text-blue-400'
        if (score >= 3.0) return 'text-amber-400'
        return 'text-red-400'
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <HistoryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Assessment History</h1>
                        <p className="text-slate-400 text-sm">Review past weld assessments, generate reports, and manage 3D data</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 sticky top-0 z-10 shadow-xl backdrop-blur-md bg-opacity-90">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-64">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by student name or ID..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Date filter */}
                    <div className="w-48">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1) }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Score filter */}
                    <div className="w-44">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={scoreFilter}
                                onChange={(e) => { setScoreFilter(e.target.value); setCurrentPage(1) }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none transition-all cursor-pointer"
                            >
                                <option value="all">All Scores</option>
                                <option value="excellent">Excellent (4.2+)</option>
                                <option value="good">Good (3.5-4.1)</option>
                                <option value="fair">Fair (2.5-3.4)</option>
                                <option value="poor">Poor (&lt;2.5)</option>
                            </select>
                        </div>
                    </div>

                    {/* Clear filters */}
                    {(searchQuery || dateFilter || scoreFilter !== 'all') && (
                        <button
                            onClick={() => { setSearchQuery(''); setDateFilter(''); setScoreFilter('all'); setCurrentPage(1) }}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="mt-3 text-sm text-slate-500 flex justify-between items-center">
                    <span>Showing {paginatedAssessments.length} of {filteredAssessments.length} assessments</span>
                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">TABLE VIEW ACTIVE</span>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                    <p className="text-slate-500 animate-pulse">Fetching history records...</p>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">Failed to load history</h3>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <button
                        onClick={fetchAssessments}
                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors font-medium border border-red-500/30"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Assessments Table */}
            {!loading && !error && (
                <>
                    {paginatedAssessments.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
                            <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium opacity-50">No assessments records found</p>
                            <p className="text-sm opacity-30 mt-1">Try adjusting your filters or search query</p>
                        </div>
                    ) : (
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
                                        {paginatedAssessments.map((assessment) => (
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
                                                            className="p-2.5 bg-slate-800 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-all border border-slate-700 hover:border-emerald-500/40 shadow-sm"
                                                            title="Generate PDF Report"
                                                        >
                                                            <FileText className="w-4.5 h-4.5" />
                                                        </button>

                                                        {(assessment.type === 'scan' || assessment.assessment) && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleView3D(assessment.type === 'scan' ? assessment.id : assessment.assessment)}
                                                                    className="p-2.5 bg-slate-800 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 rounded-lg transition-all border border-slate-700 hover:border-purple-500/40 shadow-sm"
                                                                    title="View 3D Interactive Model"
                                                                >
                                                                    <Eye className="w-4.5 h-4.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadPLY(assessment.type === 'scan' ? assessment.id : assessment.assessment)}
                                                                    className="p-2.5 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-slate-700 hover:border-blue-500/40 shadow-sm"
                                                                    title="Download 3D Data (CloudCompare)"
                                                                >
                                                                    <Download className="w-4.5 h-4.5" />
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
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2.5 rounded-xl bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all border border-slate-700 active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1.5 font-bold">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((page, i, arr) => {
                                        const showEllipsis = i > 0 && page - arr[i - 1] > 1;
                                        return (
                                            <div key={page} className="flex items-center gap-1.5">
                                                {showEllipsis && <span className="text-slate-600 px-1">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-xl transition-all border ${currentPage === page
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            </div>
                                        )
                                    })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2.5 rounded-xl bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all border border-slate-700 active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 3D Viewer Modal */}
            {show3DViewer && selectedAssessment && (
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
                                        <span>{selectedAssessment.student_name}</span>
                                        <span className="text-slate-700">•</span>
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(selectedAssessment.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleDownloadPLY(selectedAssessment.id)}
                                    className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PLY
                                </button>
                                <button
                                    onClick={() => { setShow3DViewer(false); setSelectedAssessment(null) }}
                                    className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* 3D Viewer Area */}
                        <div className="flex-1 bg-black relative">
                            <WeldViewer3D
                                assessmentId={selectedAssessment.id}
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
                                    <div className={`text-2xl font-black ${getScoreColor(selectedAssessment.final_score)}`}>
                                        {selectedAssessment.final_score?.toFixed(1) || 'N/A'}<span className="text-xs text-slate-600">/5</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-800" />
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Status</div>
                                    <div className={`text-sm font-bold ${selectedAssessment.final_score >= 3.0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {selectedAssessment.final_score >= 3.0 ? 'CERTIFIED PASS' : 'IMPROVEMENT REQ.'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDownloadReport(selectedAssessment)}
                                className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                VIEW DETAILED REPORT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
