import React, { useState, useEffect, useCallback, FC } from 'react'
import { Cpu } from 'lucide-react'

// Subcomponents
import { DashboardHeader } from './dashboard/DashboardHeader'
import { CameraFeed } from './dashboard/CameraFeed'
import { MetricCard } from './dashboard/MetricCard'
import { DefectsCard } from './dashboard/DefectsCard'
import { RubricPanel } from './dashboard/RubricPanel'

// Types
import { Course, Student, Rubric, Metrics, EvaluationResult } from './dashboard/types'
import { getStoredToken } from '../services/authAPI'

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

const Dashboard: FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null)
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false)
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([])
  const [criterionScores, setCriterionScores] = useState<Record<number, number>>({})
  const [aiSuggestedIds, setAiSuggestedIds] = useState<Set<number>>(new Set()) // criteria auto-scored by AI
  const [isLiveData, setIsLiveData] = useState<boolean>(false) // true = real edge device data
  const [workpieceWidth, setWorkpieceWidth] = useState<number>(
    () => Number(localStorage.getItem('wv_workpiece_w') || 100)
  )
  const [workpieceHeight, setWorkpieceHeight] = useState<number>(
    () => Number(localStorage.getItem('wv_workpiece_h') || 50)
  )

  const [metrics, setMetrics] = useState<Metrics>({
    height: 2.1,
    width: 10.2,
    undercut: 0.1,
    score: 95,
    defects: {
      porosity: 0,
      spatter: 0,
      severeCraters: 0,
      lackOfFusion: 0,
      excessiveReinforcement: 0,
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
      const res = await fetch('/api/rubrics', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const rubricList = (Array.isArray(data) ? data : (data.results || [])) as Rubric[]
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

  const initCriterionScores = (rubric: Rubric) => {
    if (!rubric?.criteria) return
    const scores: Record<number, number> = {}
    rubric.criteria.forEach(c => {
      scores[c.id] = 3 // Default to middle score
    })
    setCriterionScores(scores)
    setAiSuggestedIds(new Set())
  }

  const suggestScoresFromMetrics = useCallback((rubric: Rubric, currentMetrics: Metrics) => {
    if (!rubric?.criteria) return

    const newSuggested = new Set<number>()
    const updates: Record<number, number> = {}

    rubric.criteria.forEach(c => {
      const name = c.name.toLowerCase()

      // Weld Bead quality — scored on bead width (8–12 mm ideal)
      if (name.includes('weld bead') || name.includes('bead geometry')) {
        const w = currentMetrics.width
        let s = 1
        if (w >= 9 && w <= 11)      s = 5
        else if (w >= 8 && w <= 12)  s = 4
        else if (w >= 7 && w <= 13)  s = 3
        else if (w >= 6 && w <= 14)  s = 2
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Excessive Reinforcement — higher height = worse score
      else if (name.includes('excessive reinforcement') || name.includes('reinforcement')) {
        const h = currentMetrics.height
        const er = currentMetrics.defects.excessiveReinforcement
        let s = 1
        if (er === 0 && h <= 2.5)    s = 5
        else if (er === 0 && h <= 3.0) s = 4
        else if (h <= 3.5)           s = 3
        else if (h <= 4.0)           s = 2
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

      // Severe Craters
      else if (name.includes('crater')) {
        const sc = currentMetrics.defects.severeCraters
        const s = sc === 0 ? 5 : sc === 1 ? 3 : sc === 2 ? 2 : 1
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Lack of Fusion
      else if (name.includes('fusion')) {
        const lof = currentMetrics.defects.lackOfFusion
        const s = lof === 0 ? 5 : 1
        updates[c.id] = s
        newSuggested.add(c.id)
      }

      // Undercut  (< 0.5 mm ideal)
      else if (name.includes('undercut')) {
        const u = currentMetrics.undercut
        let s = 1
        if (u < 0.2)           s = 5
        else if (u < 0.5)      s = 4
        else if (u < 1.0)      s = 3
        else if (u < 2.0)      s = 2
        updates[c.id] = s
        newSuggested.add(c.id)
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
      const sessRes = await fetch('/api/sessions/active', { headers: authHeaders() })
      let sessionId = null
      if (sessRes.ok) {
        const sessData = await sessRes.json()
        sessionId = sessData.id
      }

      // Then get courses for that session
      const url = sessionId ? `/api/courses?session_id=${sessionId}` : '/api/courses'
      const res = await fetch(url, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCourses((Array.isArray(data) ? data : (data.results || [])) as Course[])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchStudents = async (courseId: number | null = null) => {
    try {
      const url = courseId ? `/api/students?course_id=${courseId}` : '/api/students'

      const res = await fetch(url, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const studentList = (Array.isArray(data) ? data : (data.results || [])) as Student[]
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
          `/api/students/${selectedStudent.student_id}/assessments?limit=1`,
          { headers: authHeaders() }
        )
        if (!res.ok) throw new Error('fetch failed')

        const data = await res.json()
        const latest = (data.assessments || [])[0]

        if (latest?.metrics_json) {
          const geo = latest.metrics_json.geometric || {}
          const vis = latest.metrics_json.visual || {}

          const newMetrics: Metrics = {
            height: parseFloat((geo.reinforcement_height_mm ?? 2.1).toFixed(2)),
            width: parseFloat((geo.bead_width_mm ?? 10.2).toFixed(2)),
            undercut: parseFloat((geo.undercut_depth_mm ?? 0.1).toFixed(2)),
            score: geo.overall_score ?? 100,
            defects: {
              porosity: vis.porosity_count ?? 0,
              spatter: vis.spatter_count ?? 0,
              severeCraters: vis.severe_craters_count ?? 0,
              lackOfFusion: vis.lack_of_fusion_present ? 1 : 0,
              excessiveReinforcement: vis.excessive_reinforcement_present ? 1 : 0,
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
      const newMetrics: Metrics = {
        height: parseFloat((2.1 + (Math.random() - 0.5) * 0.2).toFixed(2)),
        width: parseFloat((10.0 + Math.random() * 2).toFixed(2)),
        undercut: parseFloat((0.1 + Math.random() * 0.3).toFixed(2)),
        score: Math.floor(80 + Math.random() * 20),
        defects: {
          porosity: Math.floor(Math.random() * 3),
          spatter: Math.floor(Math.random() * 5),
          severeCraters: Math.floor(Math.random() * 2),
          lackOfFusion: Math.floor(Math.random() * 2),
          excessiveReinforcement: Math.floor(Math.random() * 2),
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

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    suggestScoresFromMetrics(selectedRubric, metrics)
  }

  const stopEvaluation = async () => {
    setIsEvaluating(false)
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

      let savedEvaluationId: number | null = null
      try {
        const res = await fetch('/api/rubrics/evaluations', {
          method: 'POST',
          headers: authHeaders(),
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

      const result: EvaluationResult = {
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
      initCriterionScores(selectedRubric)
    }
  }

  const handleRubricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rubricId = Number(e.target.value)
    const rubric = rubrics.find(r => r.id === rubricId)
    setSelectedRubric(rubric || null)
    if (rubric) {
      initCriterionScores(rubric)
    }
  }

  const updateCriterionScore = (criterionId: number, score: number) => {
    setCriterionScores(prev => ({ ...prev, [criterionId]: score }))
    setAiSuggestedIds(prev => {
      const next = new Set(prev)
      next.delete(criterionId)
      return next
    })
  }

  // Validation Functions
  const isHeightValid = metrics.height >= 1 && metrics.height <= 3
  const isWidthValid = metrics.width >= 8 && metrics.width <= 12
  const undercutStatus = metrics.undercut < 0.5 ? true : metrics.undercut < 1.0 ? 'warning' : false

  return (
    <div className="p-8 space-y-6">
      <DashboardHeader 
        courses={courses}
        students={students}
        rubrics={rubrics}
        selectedCourse={selectedCourse}
        selectedStudent={selectedStudent}
        selectedRubric={selectedRubric}
        isEvaluating={isEvaluating}
        workpieceWidth={workpieceWidth}
        workpieceHeight={workpieceHeight}
        onCourseChange={handleCourseChange}
        onStudentChange={(e) => {
          const s = students.find(s => s.id === Number(e.target.value))
          setSelectedStudent(s || null)
        }}
        onRubricChange={handleRubricChange}
        onWidthChange={(v) => {
          setWorkpieceWidth(v); 
          localStorage.setItem('wv_workpiece_w', String(v))
        }}
        onHeightChange={(v) => {
          setWorkpieceHeight(v); 
          localStorage.setItem('wv_workpiece_h', String(v))
        }}
        onStartEvaluation={startEvaluation}
        onStopEvaluation={stopEvaluation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CameraFeed isEvaluating={isEvaluating} />

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

          <MetricCard 
            title="Reinforcement Height"
            value={metrics.height}
            unit="mm"
            targetText="1.0 - 3.0 mm"
            isValid={isHeightValid}
          />

          <MetricCard 
            title="Bead Width"
            value={metrics.width}
            unit="mm"
            targetText="8.0 - 12.0 mm"
            isValid={isWidthValid}
          />

          <MetricCard 
            title="Undercut Depth"
            value={metrics.undercut}
            unit="mm"
            targetText="< 0.5 mm"
            isValid={undercutStatus}
          />

          {/* Pipeline Score Card */}
          <div className="p-4 rounded-lg bg-slate-900 border-2 border-industrial-blue shadow-lg shadow-industrial-blue/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Pipeline Fusion Score</span>
              <Cpu className="w-5 h-5 text-industrial-blue" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black text-white">
                {metrics.score}
              </div>
              <div className="text-slate-500 font-bold">/ 100</div>
            </div>
            <progress
              className={`appearance-none block mt-2 w-full h-1.5 rounded-full [&::-webkit-progress-bar]:bg-slate-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 ${metrics.score >= 70 ? '[&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500' : '[&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500'}`}
              value={metrics.score}
              max={100}
            />
          </div>

          <DefectsCard defects={metrics.defects} />
        </div>
      </div>

      {isEvaluating && selectedRubric && (
        <RubricPanel 
          selectedRubric={selectedRubric}
          metrics={metrics}
          criterionScores={criterionScores}
          aiSuggestedIds={aiSuggestedIds}
          onUpdateScore={updateCriterionScore}
          onRescoreAI={() => suggestScoresFromMetrics(selectedRubric, metrics)}
        />
      )}
    </div>
  )
}

export default Dashboard
