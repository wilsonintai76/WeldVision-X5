import React from 'react'
import { Play, Square } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Course, Student, Rubric } from './types'

interface DashboardHeaderProps {
  courses: Course[]
  students: Student[]
  rubrics: Rubric[]
  selectedCourse: Course | null
  selectedStudent: Student | null
  selectedRubric: Rubric | null
  isEvaluating: boolean
  workpieceWidth: number
  workpieceHeight: number
  onCourseChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onStudentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onRubricChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onWidthChange: (v: number) => void
  onHeightChange: (v: number) => void
  onStartEvaluation: () => void
  onStopEvaluation: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  courses,
  students,
  rubrics,
  selectedCourse,
  selectedStudent,
  selectedRubric,
  isEvaluating,
  workpieceWidth,
  workpieceHeight,
  onCourseChange,
  onStudentChange,
  onRubricChange,
  onWidthChange,
  onHeightChange,
  onStartEvaluation,
  onStopEvaluation
}) => {
  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 flex-1">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs text-slate-500 mb-1 block">Course</Label>
          <select
            className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white p-2"
            onChange={onCourseChange}
            value={selectedCourse?.id || ''}
          >
            <option value="">Select Course...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs text-slate-500 mb-1 block">Student</Label>
          <select
            className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white p-2"
            onChange={onStudentChange}
            value={selectedStudent?.id || ''}
          >
            <option value="">Select Student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.student_id} - {s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs text-slate-500 mb-1 block">Assessment Rubric</Label>
          <select
            className="w-full bg-slate-800 border-slate-700 rounded-lg text-sm text-white p-2"
            onChange={onRubricChange}
            value={selectedRubric?.id || ''}
          >
            <option value="">Select Rubric...</option>
            {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* Evaluation Controls */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Workpiece W (mm)</Label>
          <Input
            type="number" min="10" max="500"
            value={workpieceWidth}
            onChange={e => onWidthChange(Number(e.target.value))}
            className="w-24 bg-slate-800 border-slate-700 text-white text-center h-9"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Workpiece H (mm)</Label>
          <Input
            type="number" min="10" max="500"
            value={workpieceHeight}
            onChange={e => onHeightChange(Number(e.target.value))}
            className="w-24 bg-slate-800 border-slate-700 text-white text-center h-9"
          />
        </div>
        <div className="h-px w-px" />
        {!isEvaluating ? (
          <Button
            onClick={onStartEvaluation}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
          >
            <Play className="w-4 h-4" />
            Start Evaluation
          </Button>
        ) : (
          <Button
            onClick={onStopEvaluation}
            variant="destructive"
            className="flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Square className="w-4 h-4" />
            Stop & Save
          </Button>
        )}
      </div>
    </div>
  )
}
