import { useState, useEffect, useCallback } from 'react'
import { Camera, AlertTriangle, CheckCircle, XCircle, User, Users, Play, Square, ClipboardCheck, Star, Download, FileText, Cpu, RotateCcw } from 'lucide-react'

// Helper to get CSRF token
function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function Dashboard() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [rubrics, setRubrics] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedRubric, setSelectedRubric] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationResults, setEvaluationResults] = useState([])
  const [criterionScores, setCriterionScores] = useState({})
  const [aiSuggestedIds, setAiSuggestedIds] = useState(new Set()) // criteria auto-scored by AI
  const [isLiveData, setIsLiveData] = useState(false) // true = real edge device data
  const [workpieceWidth, setWorkpieceWidth] = useState(
    () => Number(localStorage.getItem('wv_workpiece_w') || 100)
  )
  const [workpieceHeight, setWorkpieceHeight] = useState(
    () => Number(localStorage.getItem('wv_workpiece_h') || 50)
  )

  const [metrics, setMetrics] = useState({
    height: 2.1,
    width: 10.2,
    defects: {
      porosity: 0,
      spatter: 0,
      slagInclusion: 0,
      burnThrough: 0,
    },
  })

  // Fetch initial data
  useEffect(() => {
    fetchCourses()
    fetchStudents()
    fetchRubrics()
  }, [])

  const fetchRubrics = async () => {
    try {
      const res = await fetch('/api/assessment-rubrics/', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const rubricList = Array.isArray(data) ? data : (data.results || [])
        setRubrics(rubricList)
        // Auto-select active rubric
        const activeRubric = rubricList.find(r => r.is_active)
        if (activeRubric) {
          setSelectedRubric(activeRubric)
          initCriterionScores(activeRubric)
        }
      }
    } catch (error) {
      console.error('Error fetching rubrics:', error)
    }
  }

  const initCriterionScores = (rubric) => {
    if (!rubric?.criteria) return
    const scores = {}
    rubric.criteria.forEach(c => {
      scores[c.id] = 3 // Default to middle score
    })
    setCriterionScores(scores)
    setAiSuggestedIds(new Set())
  }

  /**
   * Map live AI metrics to Likert 1-5 scores for measurable criteria.
   * Criteria matched by keyword in name; others left as-is (manual).
   */
  const suggestScoresFromMetrics = useCallback((rubric, currentMetrics) => {
    if (!rubric?.criteria) return

    const newSuggested = new Set()
    const updates = {}

    rubric.criteria.forEach(c => {
      const name = c.name.toLowerCase()

      // Reinforcement Height  (1–3 mm ideal)
      if (name.includes('height') || name.includes('reinforcement')) {
        const h = currentMetrics.height
        let s = 1
        if (h >= 1.5 && h <= 2.5)      s = 5
        else if (h >= 1.0 && h <= 3.0)  s = 4
        else if (h >= 0.5 && h <= 3.5)  s = 3
        else if (h >= 0.0 && h <= 4.0)  s = 2
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Bead Width  (8–12 mm ideal)
      else if (name.includes('width') || name.includes('bead width')) {
        const w = currentMetrics.width
        let s = 1
        if (w >= 9 && w <= 11)      s = 5
        else if (w >= 8 && w <= 12)  s = 4
        else if (w >= 7 && w <= 13)  s = 3
        else if (w >= 6 && w <= 14)  s = 2
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Porosity
      else if (name.includes('porosity')) {
        const p = currentMetrics.defects.porosity
        const s = p === 0 ? 5 : p === 1 ? 4 : p === 2 ? 3 : p === 3 ? 2 : 1
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Spatter
      else if (name.includes('spatter')) {
        const sp = currentMetrics.defects.spatter
        const s = sp === 0 ? 5 : sp <= 2 ? 4 : sp <= 4 ? 3 : sp <= 7 ? 2 : 1
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Undercut
      else if (name.includes('undercut')) {
        // not directly measured yet — leave manual
      }
    })

    if (Object.keys(updates).length > 0) {
      setCriterionScores(prev => ({ ...prev, ...updates }))
      // Preserve any previous manual overrides (non-suggested ids stay untouched)
      setAiSuggestedIds(prev => {
        const next = new Set(prev)
        newSuggested.forEach(id => next.add(id))
        return next
      })
    }
  }, [])


  const fetchCourses = async () => {
    try {
      // First get active session
      const sessRes = await fetch('/api/sessions/active/', { credentials: 'include' })
      let sessionId = null
      if (sessRes.ok) {
        const sessData = await sessRes.json()
        sessionId = sessData.id
      }

      // Then get courses for that session
      const url = sessionId ? `/api/courses/?session=${sessionId}` : '/api/courses/'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCourses(Array.isArray(data) ? data : (data.results || []))
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudents = async (courseId = null) => {
    try {
      let url = '/api/students/'
      
      if (courseId) {
        url = `/api/courses/${courseId}/students/`
      }

      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const studentList = Array.isArray(data) ? data : (data.results || [])
        setStudents(studentList)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  // Live Metrics Polling - fetches latest assessment from edge device via backend
  useEffect(() => {
    if (!isEvaluating || !selectedStudent) return

    const pollMetrics = async () => {
      try {
        const res = await fetch(
          `/api/students/${selectedStudent.student_id}/assessments/?limit=1`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('fetch failed')

        const data = await res.json()
        const latest = (data.assessments || [])[0]

        if (latest?.metrics_json) {
          const geo = latest.metrics_json.geometric || {}
          const vis = latest.metrics_json.visual || {}


          const newMetrics = {
            height: parseFloat((geo.reinforcement_height_mm ?? 2.1).toFixed(2)),
            width: parseFloat((geo.bead_width_mm ?? 10.2).toFixed(2)),
            defects: {
              porosity: vis.porosity_count ?? 0,
              spatter: vis.spatter_count ?? 0,
              slagInclusion: vis.slag_inclusion_count ?? 0,
              burnThrough: vis.burn_through_count ?? 0,
            },
          }
          setMetrics(newMetrics)
          setIsLiveData(true)
          if (selectedRubric) suggestScoresFromMetrics(selectedRubric, newMetrics)
          return
        }
      } catch (_) {
        // server unreachable or no assessments yet — fall through to mock
      }

      // Fallback: mock data while waiting for first real upload
      setIsLiveData(false)
      const newMetrics = {
        height: parseFloat((2.1 + (Math.random() - 0.5) * 0.2).toFixed(2)),
        width: parseFloat((10.0 + Math.random() * 2).toFixed(2)),
        defects: {
          porosity: Math.floor(Math.random() * 3),
          spatter: Math.floor(Math.random() * 5),
          slagInclusion: Math.floor(Math.random() * 2),
          burnThrough: Math.floor(Math.random() * 2),
        },
      }
      setMetrics(newMetrics)
      if (selectedRubric) suggestScoresFromMetrics(selectedRubric, newMetrics)
    }

    pollMetrics() // immediate first call
    const interval = setInterval(pollMetrics, 2000)
    return () => {
      clearInterval(interval)
      setIsLiveData(false)
    }
  }, [isEvaluating, selectedStudent, selectedRubric, suggestScoresFromMetrics])

  const handleCourseChange = (e) => {
    const courseId = e.target.value ? Number(e.target.value) : null
    const course = courses.find(c => c.id === courseId)
    setSelectedCourse(course || null)
    setSelectedStudent(null)
    fetchStudents(courseId)
  }

  const startEvaluation = () => {
    if (!selectedStudent) {
      alert('Please select a student first')
      return
    }
    if (!selectedRubric) {
      alert('Please select an assessment rubric first')
      return
    }
    setIsEvaluating(true)
    // Auto-suggest scores from current AI metrics on start
    suggestScoresFromMetrics(selectedRubric, metrics)
  }

  const stopEvaluation = async () => {
    setIsEvaluating(false)
    // Calculate rubric-based score
    if (selectedStudent && selectedRubric) {
      const criteria = selectedRubric.criteria || []
      let totalWeighted = 0
      let totalWeight = 0

      criteria.forEach(c => {
        const score = criterionScores[c.id] || 3
        totalWeighted += score * c.weight
        totalWeight += c.weight
      })

      const avgScore = totalWeight > 0 ? (totalWeighted / totalWeight) : 0
      const passed = avgScore >= selectedRubric.passing_score

      // Save to backend
      let savedEvaluationId = null
      try {
        const csrfToken = getCSRFToken();
        const res = await fetch('/api/student-evaluations/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({
            student: selectedStudent.id,
            rubric: selectedRubric.id,
            total_score: avgScore,
            passed: passed,
            ai_metrics: { ...metrics, workpiece_width_mm: workpieceWidth, workpiece_height_mm: workpieceHeight },
            criterion_scores: Object.entries(criterionScores).map(([criterionId, score]) => ({
              criterion: parseInt(criterionId),
              score: score
            }))
          })
        })
        if (res.ok) {
          const data = await res.json()
          savedEvaluationId = data.id
        }
      } catch (error) {
        console.error('Error saving evaluation:', error)
      }

      const result = {
        id: savedEvaluationId,
        student: selectedStudent,
        rubric: selectedRubric.name,
        rubricId: selectedRubric.id,
        timestamp: new Date().toISOString(),
        metrics: { ...metrics },
        criterionScores: { ...criterionScores },
        avgScore: avgScore.toFixed(2),
        passed
      }
      setEvaluationResults(prev => [result, ...prev].slice(0, 10))

      // Reset scores for next evaluation
      initCriterionScores(selectedRubric)
    }
  }

  const downloadEvaluationPdf = async (evaluationId) => {
    if (!evaluationId) {
      alert('Evaluation not saved to server. Please try again.')
      return
    }
    try {
      const res = await fetch(`/api/student-evaluations/${evaluationId}/report_pdf/`, { credentials: 'include' })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `evaluation_${evaluationId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        alert('Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error downloading PDF')
    }
  }

  const downloadStudentSummaryPdf = async (studentId) => {
    try {
      const res = await fetch(`/api/student-evaluations/student_report_pdf/?student_id=${studentId}`, { credentials: 'include' })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `student_report_${studentId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        alert('Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error downloading PDF')
    }
  }


  const handleRubricChange = (e) => {
    const rubricId = Number(e.target.value)
    const rubric = rubrics.find(r => r.id === rubricId)
    setSelectedRubric(rubric || null)
    if (rubric) {
      initCriterionScores(rubric)
    }
  }

  const updateCriterionScore = (criterionId, score) => {
    setCriterionScores(prev => ({ ...prev, [criterionId]: score }))
    // Mark as manually overridden — remove AI badge
    setAiSuggestedIds(prev => {
      const next = new Set(prev)
      next.delete(criterionId)
      return next
    })
  }

  const getTotalDefects = () => {
    return Object.values(metrics.defects).reduce((a, b) => a + b, 0)
  }

  // Validation Functions
  const isHeightValid = metrics.height >= 1 && metrics.height <= 3
  const isWidthValid = metrics.width >= 8 && metrics.width <= 12

  return (
    <div className="p-8 space-y-6">
      {/* Top Bar - Student Selection */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="flex-1 max-w-sm">
            <label className="text-xs text-slate-500 mb-1 block">Course</label>
            <select
              className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white"
              onChange={handleCourseChange}
              value={selectedCourse?.id || ''}
            >
              <option value="">Select Course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-md">
            <label className="text-xs text-slate-500 mb-1 block">Student</label>
            <select
              className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white"
              onChange={(e) => {
                const s = students.find(s => s.id === Number(e.target.value))
                setSelectedStudent(s)
              }}
              value={selectedStudent?.id || ''}
            >
              <option value="">Select Student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_id} - {s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-md">
            <label className="text-xs text-slate-500 mb-1 block">Assessment Rubric</label>
            <select
              className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white"
              onChange={handleRubricChange}
              value={selectedRubric?.id || ''}
            >
              <option value="">Select Rubric...</option>
              {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Evaluation Controls */}
        <div className="flex gap-3 items-end flex-wrap">
          {/* Workpiece size inputs */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Workpiece W (mm)</label>
            <input
              type="number" min="10" max="500"
              value={workpieceWidth}
              onChange={e => { const v = Number(e.target.value); setWorkpieceWidth(v); localStorage.setItem('wv_workpiece_w', v) }}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-2 py-1.5 text-center"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Workpiece H (mm)</label>
            <input
              type="number" min="10" max="500"
              value={workpieceHeight}
              onChange={e => { const v = Number(e.target.value); setWorkpieceHeight(v); localStorage.setItem('wv_workpiece_h', v) }}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-2 py-1.5 text-center"
            />
          </div>
          <div className="h-px w-px" />
          {!isEvaluating ? (
            <button
              onClick={startEvaluation}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4" />
              Start Evaluation
            </button>
          ) : (
            <button
              onClick={stopEvaluation}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-red-600/20"
            >
              <Square className="w-4 h-4" />
              Stop & Save
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed / Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-black rounded-xl border border-slate-800 aspect-video relative overflow-hidden group">


            {/* LIVE CAMERA VIEW */}
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Camera Feed</p>
              <p className="text-sm opacity-60">Awaiting RDK X5 Connection</p>
              {isEvaluating && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full animate-pulse border border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-semibold">LIVE RECORDING</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Metrics */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-semibold text-white">Live Metrics</h3>
            {isEvaluating && (
              isLiveData
                ? <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-900 text-emerald-300 border border-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    LIVE
                  </span>
                : <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900 text-yellow-300 border border-yellow-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                    MOCK
                  </span>
            )}
          </div>

          {/* Reinforcement Height Card */}
          <div className={`p-4 rounded-lg border-2 transition-all ${isHeightValid
            ? 'bg-green-950/30 border-green-600'
            : 'bg-red-950/30 border-red-600'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Reinforcement Height</span>
              {isHeightValid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics.height.toFixed(2)} <span className="text-lg text-slate-400">mm</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Target: 1.0 - 3.0 mm
            </div>
          </div>

          {/* Bead Width Card */}
          <div className={`p-4 rounded-lg border-2 transition-all ${isWidthValid
            ? 'bg-green-950/30 border-green-600'
            : 'bg-red-950/30 border-red-600'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Bead Width</span>
              {isWidthValid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics.width.toFixed(2)} <span className="text-lg text-slate-400">mm</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Target: 8.0 - 12.0 mm
            </div>
          </div>

          {/* Visual Defects Card */}
          <div className="p-4 rounded-lg bg-industrial-slate border-2 border-industrial-gray">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-slate-300">Visual Defects</span>
              <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${getTotalDefects() === 0 ? 'bg-green-900 text-green-300' :
                getTotalDefects() < 5 ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                }`}>
                {getTotalDefects()} total
              </span>
            </div>
            <div className="space-y-2">
              <DefectRow label="Porosity" count={metrics.defects.porosity} />
              <DefectRow label="Spatter" count={metrics.defects.spatter} />
              <DefectRow label="Slag Inclusion" count={metrics.defects.slagInclusion} />
              <DefectRow label="Burn-Through" count={metrics.defects.burnThrough} />
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Scoring Panel - Shows during evaluation */}
      {isEvaluating && selectedRubric && (
        <div className="bg-industrial-slate rounded-lg border-2 border-emerald-600 p-6">
          <div className="flex items-center justify-between mb-4">
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
                {(() => {
                  const criteria = selectedRubric.criteria || []
                  let totalWeighted = 0
                  let totalWeight = 0
                  criteria.forEach(c => {
                    const score = criterionScores[c.id] || 3
                    totalWeighted += score * c.weight
                    totalWeight += c.weight
                  })
                  return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : '0.00'
                })()}
              </span>
              <span className="text-slate-500">/5</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${(() => {
                const criteria = selectedRubric.criteria || []
                let totalWeighted = 0
                let totalWeight = 0
                criteria.forEach(c => {
                  const score = criterionScores[c.id] || 3
                  totalWeighted += score * c.weight
                  totalWeight += c.weight
                })
                const avg = totalWeight > 0 ? (totalWeighted / totalWeight) : 0
                return avg >= selectedRubric.passing_score ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              })()
                }`}>
                {(() => {
                  const criteria = selectedRubric.criteria || []
                  let totalWeighted = 0
                  let totalWeight = 0
                  criteria.forEach(c => {
                    const score = criterionScores[c.id] || 3
                    totalWeighted += score * c.weight
                    totalWeight += c.weight
                  })
                  const avg = totalWeight > 0 ? (totalWeighted / totalWeight) : 0
                  return avg >= selectedRubric.passing_score ? 'PASSING' : 'FAILING'
                })()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedRubric.criteria || []).map(criterion => {
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
                          onClick={() => {
                            suggestScoresFromMetrics(selectedRubric, metrics)
                          }}
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
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => updateCriterionScore(criterion.id, score)}
                        className={`flex-1 py-2 px-1 text-sm font-medium rounded transition-all ${
                          criterionScores[criterion.id] === score
                            ? isAI
                              ? score <= 2 ? 'bg-red-600 text-white ring-2 ring-blue-400'
                                : score === 3 ? 'bg-yellow-600 text-white ring-2 ring-blue-400'
                                : 'bg-green-600 text-white ring-2 ring-blue-400'
                              : score <= 2 ? 'bg-red-600 text-white'
                                : score === 3 ? 'bg-yellow-600 text-white'
                                : 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                        title={isAI && criterionScores[criterion.id] === score ? 'AI suggested — click another to override' : ''}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  {/* Score Description */}
                  <div className={`mt-2 text-xs min-h-[2.5rem] ${ isAI ? 'text-blue-400/70' : 'text-slate-500' }`}>
                    {criterionScores[criterion.id] === 1 && (criterion.score_1_description || criterion.likert_1 || 'Very Poor')}
                    {criterionScores[criterion.id] === 2 && (criterion.score_2_description || criterion.likert_2 || 'Poor')}
                    {criterionScores[criterion.id] === 3 && (criterion.score_3_description || criterion.likert_3 || 'Acceptable')}
                    {criterionScores[criterion.id] === 4 && (criterion.score_4_description || criterion.likert_4 || 'Good')}
                    {criterionScores[criterion.id] === 5 && (criterion.score_5_description || criterion.likert_5 || 'Excellent')}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-slate-500 text-sm mt-4 text-center">
            Passing Score: {selectedRubric.passing_score} / 5
          </p>
        </div>
      )}

      {/* Recent Evaluations */}
      {evaluationResults.length > 0 && (
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Evaluations</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Student</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Rubric</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Time</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-slate-300">Score</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-slate-300">Result</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-slate-300">Report</th>
                </tr>
              </thead>
              <tbody>
                {evaluationResults.map((result, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {result.student.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{result.student.name}</p>
                          <p className="text-slate-500 text-xs">{result.student.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-sm">
                      {result.rubric}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-sm">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-lg font-bold ${result.passed ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {result.avgScore}
                      </span>
                      <span className="text-slate-500 text-xs">/5</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {result.passed ? (
                        <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded text-sm font-medium">
                          PASS
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-900/50 text-red-400 rounded text-sm font-medium">
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {result.id ? (
                        <button
                          onClick={() => downloadEvaluationPdf(result.id)}
                          className="p-2 hover:bg-slate-700 rounded transition-colors text-blue-400 hover:text-blue-300"
                          title="Download PDF Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Students Today" value={evaluationResults.length.toString()} trend="" />
        <StatCard title="Pass Rate" value={evaluationResults.length > 0
          ? `${Math.round((evaluationResults.filter(r => r.passed).length / evaluationResults.length) * 100)}%`
          : 'N/A'} trend="" />
        <StatCard title="Avg. Height" value={evaluationResults.length > 0
          ? `${(evaluationResults.reduce((sum, r) => sum + r.metrics.height, 0) / evaluationResults.length).toFixed(2)}mm`
          : 'N/A'} trend="" />
        <StatCard title="Total Defects" value={evaluationResults.reduce((sum, r) =>
          sum + Object.values(r.metrics.defects).reduce((a, b) => a + b, 0), 0).toString()} trend="" />
      </div>
    </div>
  )
}

// Helper Components
function DefectRow({ label, count }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${count > 0 ? 'text-red-400' : 'text-green-400'
        }`}>
        {count}
      </span>
    </div>
  )
}

function StatCard({ title, value, trend }) {
  const isPositive = trend && trend.startsWith('+')
  return (
    <div className="p-4 bg-industrial-slate rounded-lg border border-industrial-gray">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend && (
          <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-slate-400'
            }`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

export default Dashboard


