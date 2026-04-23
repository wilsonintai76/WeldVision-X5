import React from 'react'
import { X, Trash2, GraduationCap } from 'lucide-react'
import { Course, Student } from '../types'

interface EnrolledStudentsModalProps {
  show: boolean;
  onClose: () => void;
  selectedCourse: Course | null;
  courseStudents: Student[];
  handleUnenroll: (studentId: number) => void;
}

const EnrolledStudentsModal: React.FC<EnrolledStudentsModalProps> = ({
  show,
  onClose,
  selectedCourse,
  courseStudents,
  handleUnenroll
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Enrolled Students</h3>
            <p className="text-slate-400 text-sm">{selectedCourse?.code}: {selectedCourse?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto border border-slate-700 rounded-lg bg-slate-900">
          {courseStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No students enrolled in this course
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800 border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Reg. Number</th>
                  <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Name</th>
                  <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Class</th>
                  <th className="p-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {courseStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-white font-mono text-sm">{student.student_id}</td>
                    <td className="p-3 text-slate-300 text-sm">{student.name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs">
                        <GraduationCap className="w-3 h-3" />
                        {student.class_group_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleUnenroll(student.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Unenroll"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnrolledStudentsModal
